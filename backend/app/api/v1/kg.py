from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from loguru import logger

from app.models.schemas import KnowledgeGraphResponse
from app.core.kg_client import kg_client
from app.utils.prometheus_metrics import metrics

router = APIRouter()

@router.get("/kg/{session_id}", response_model=KnowledgeGraphResponse)
async def get_session_knowledge_graph(session_id: str):
    """Get knowledge graph for a diagnosis session"""
    
    try:
        # Get session data
        from app.utils.io_helpers import DatabaseHelper
        session = DatabaseHelper.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Extract symptoms and complaints for KG traversal
        symptoms = session.get("symptoms", [])
        complaints = session.get("complaints", [])
        
        # Combine symptoms and complaints as starting nodes
        starting_nodes = symptoms + complaints
        
        if not starting_nodes:
            return KnowledgeGraphResponse(nodes=[], edges=[])
        
        # Get subgraph around these nodes
        subgraph = await kg_client.get_subgraph_by_nodes(starting_nodes, radius=2)
        
        # Track metrics
        metrics.record_kg_query()
        
        logger.info(f"Retrieved KG for session {session_id}: {len(subgraph['nodes'])} nodes, {len(subgraph['edges'])} edges")
        
        return KnowledgeGraphResponse(
            nodes=subgraph["nodes"],
            edges=subgraph["edges"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get KG for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get knowledge graph: {str(e)}")

@router.get("/kg/explore/{node_id}")
async def explore_node(node_id: str, radius: int = Query(default=1, ge=1, le=3)):
    """Explore knowledge graph around a specific node"""
    
    try:
        # Get subgraph around the node
        subgraph = await kg_client.get_subgraph_by_nodes([node_id], radius=radius)
        
        # Get node neighbors for additional context
        neighbors = await kg_client.get_node_neighbors(node_id, max_neighbors=10)
        
        # Track metrics
        metrics.record_kg_query()
        
        return {
            "nodeId": node_id,
            "subgraph": subgraph,
            "neighbors": neighbors,
            "radius": radius
        }
        
    except Exception as e:
        logger.error(f"Failed to explore node {node_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to explore node: {str(e)}")

@router.get("/kg/path/{source_node}/{target_node}")
async def find_path(source_node: str, target_node: str):
    """Find shortest path between two nodes in the knowledge graph"""
    
    try:
        path = await kg_client.find_shortest_path(source_node, target_node)
        
        if not path:
            return {
                "source": source_node,
                "target": target_node,
                "path": None,
                "message": "No path found between nodes"
            }
        
        # Get subgraph for the path
        subgraph = await kg_client.get_subgraph_by_nodes(path, radius=1)
        
        # Track metrics
        metrics.record_kg_query()
        
        return {
            "source": source_node,
            "target": target_node,
            "path": path,
            "pathLength": len(path) - 1,
            "subgraph": subgraph
        }
        
    except Exception as e:
        logger.error(f"Failed to find path from {source_node} to {target_node}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to find path: {str(e)}")

@router.get("/kg/disease/{disease_name}")
async def get_disease_info(disease_name: str):
    """Get disease information from the ontology"""
    
    try:
        disease_info = await kg_client.get_disease_info(disease_name)
        
        if not disease_info:
            raise HTTPException(status_code=404, detail=f"Disease not found: {disease_name}")
        
        # Get related nodes in the knowledge graph
        related_subgraph = await kg_client.get_subgraph_by_nodes([disease_name], radius=2)
        
        return {
            "disease": disease_name,
            "info": disease_info,
            "relatedNodes": related_subgraph
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get disease info for {disease_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get disease info: {str(e)}")

@router.get("/kg/symptoms/{symptom}")
async def get_symptom_relations(symptom: str, max_relations: int = Query(default=10, ge=1, le=50)):
    """Get diseases and conditions related to a symptom"""
    
    try:
        # Get neighbors of the symptom node
        neighbors = await kg_client.get_node_neighbors(symptom, max_neighbors=max_relations)
        
        # Get relevant triplets
        triplets = await kg_client.get_top_triplets_for_patient([symptom], top_k=max_relations)
        
        # Get subgraph around symptom
        subgraph = await kg_client.get_subgraph_by_nodes([symptom], radius=2)
        
        # Track metrics
        metrics.record_kg_query()
        
        return {
            "symptom": symptom,
            "neighbors": neighbors,
            "triplets": triplets,
            "subgraph": subgraph
        }
        
    except Exception as e:
        logger.error(f"Failed to get symptom relations for {symptom}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get symptom relations: {str(e)}")

@router.get("/kg/stats")
async def get_knowledge_graph_stats():
    """Get knowledge graph statistics"""
    
    try:
        stats = kg_client.get_stats()
        
        return {
            "knowledgeGraph": stats,
            "message": "Knowledge graph statistics retrieved successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to get KG stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@router.post("/kg/analyze")
async def analyze_symptoms(symptoms: List[str], max_triplets: int = Query(default=20, ge=1, le=100)):
    """Analyze a list of symptoms using the knowledge graph"""
    
    try:
        if not symptoms:
            raise HTTPException(status_code=400, detail="No symptoms provided")
        
        # Get relevant triplets for all symptoms
        all_triplets = await kg_client.get_top_triplets_for_patient(symptoms, top_k=max_triplets)
        
        # Get subgraph for all symptoms
        subgraph = await kg_client.get_subgraph_by_nodes(symptoms, radius=2)
        
        # Compute edge weights between symptom nodes
        edge_weights = await kg_client.compute_edge_weights(symptoms)
        
        # Track metrics
        metrics.record_kg_query()
        
        return {
            "symptoms": symptoms,
            "triplets": all_triplets,
            "subgraph": subgraph,
            "edgeWeights": [
                {
                    "source": edge[0],
                    "target": edge[1],
                    "weight": weight
                }
                for edge, weight in edge_weights.items()
            ],
            "analysis": {
                "totalTriplets": len(all_triplets),
                "connectedSymptoms": len([w for w in edge_weights.values() if w > 0]),
                "avgRelevanceScore": sum(t.get("relevance_score", 0) for t in all_triplets) / len(all_triplets) if all_triplets else 0
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to analyze symptoms {symptoms}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze symptoms: {str(e)}")