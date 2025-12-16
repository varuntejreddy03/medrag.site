import os
import json
import pickle
import networkx as nx
from typing import List, Dict, Tuple, Optional, Set
from loguru import logger
from app.config import settings

class KnowledgeGraphClient:
    def __init__(self):
        self.graph = None
        self.triplets = None
        self.disease_ontology = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize knowledge graph and load data"""
        if self._initialized:
            return
        
        try:
            # Load knowledge graph
            if os.path.exists(settings.knowledge_graph_path):
                with open(settings.knowledge_graph_path, 'rb') as f:
                    self.graph = pickle.load(f)
                logger.info(f"Loaded knowledge graph with {self.graph.number_of_nodes()} nodes and {self.graph.number_of_edges()} edges")
            else:
                logger.warning(f"Knowledge graph not found at {settings.knowledge_graph_path}")
                self.graph = nx.Graph()
            
            # Load triplets
            if os.path.exists(settings.triplets_path):
                with open(settings.triplets_path, 'r') as f:
                    self.triplets = json.load(f)
                logger.info(f"Loaded {len(self.triplets)} triplets")
            
            # Load disease ontology
            if os.path.exists(settings.disease_ontology_path):
                with open(settings.disease_ontology_path, 'r') as f:
                    self.disease_ontology = json.load(f)
                logger.info(f"Loaded disease ontology with {len(self.disease_ontology)} entries")
            
            self._initialized = True
            logger.info("Knowledge graph client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize knowledge graph client: {e}")
            raise
    
    async def get_subgraph_by_nodes(self, node_list: List[str], radius: int = 2) -> Dict:
        """Get subgraph around specified nodes"""
        if not self._initialized:
            await self.initialize()
        
        if not self.graph:
            return {"nodes": [], "edges": []}
        
        try:
            # Find all nodes within radius
            subgraph_nodes = set(node_list)
            
            for node in node_list:
                if node in self.graph:
                    # Get neighbors within radius
                    neighbors = nx.single_source_shortest_path_length(self.graph, node, cutoff=radius)
                    subgraph_nodes.update(neighbors.keys())
            
            # Create subgraph
            subgraph = self.graph.subgraph(subgraph_nodes)
            
            # Convert to D3.js format
            nodes = []
            for node in subgraph.nodes():
                node_data = subgraph.nodes[node]
                nodes.append({
                    "id": node,
                    "label": node_data.get("label", node),
                    "type": node_data.get("type", "unknown"),
                    "confidence": node_data.get("confidence")
                })
            
            edges = []
            for source, target in subgraph.edges():
                edge_data = subgraph.edges[source, target]
                edges.append({
                    "source": source,
                    "target": target,
                    "relationship": edge_data.get("relationship", "related"),
                    "weight": edge_data.get("weight", 1.0)
                })
            
            return {"nodes": nodes, "edges": edges}
            
        except Exception as e:
            logger.error(f"Failed to get subgraph: {e}")
            return {"nodes": [], "edges": []}
    
    async def get_top_triplets_for_patient(self, symptoms: List[str], top_k: int = 10) -> List[Dict]:
        """Get relevant triplets for patient symptoms"""
        if not self.triplets:
            return []
        
        try:
            relevant_triplets = []
            
            # Convert symptoms to lowercase for matching
            symptoms_lower = [s.lower() for s in symptoms]
            
            for triplet in self.triplets:
                subject = triplet.get("subject", "").lower()
                predicate = triplet.get("predicate", "").lower()
                object_val = triplet.get("object", "").lower()
                
                # Check if any symptom matches subject or object
                relevance_score = 0
                for symptom in symptoms_lower:
                    if symptom in subject or symptom in object_val:
                        relevance_score += 1
                    if symptom in predicate:
                        relevance_score += 0.5
                
                if relevance_score > 0:
                    triplet_with_score = triplet.copy()
                    triplet_with_score["relevance_score"] = relevance_score
                    relevant_triplets.append(triplet_with_score)
            
            # Sort by relevance and return top_k
            relevant_triplets.sort(key=lambda x: x["relevance_score"], reverse=True)
            return relevant_triplets[:top_k]
            
        except Exception as e:
            logger.error(f"Failed to get relevant triplets: {e}")
            return []
    
    async def get_disease_info(self, disease_name: str) -> Optional[Dict]:
        """Get disease information from ontology"""
        if not self.disease_ontology:
            return None
        
        # Try exact match first
        disease_info = self.disease_ontology.get(disease_name)
        if disease_info:
            return disease_info
        
        # Try case-insensitive match
        disease_lower = disease_name.lower()
        for disease, info in self.disease_ontology.items():
            if disease.lower() == disease_lower:
                return info
        
        return None
    
    async def compute_edge_weights(self, nodes: List[str]) -> Dict[Tuple[str, str], float]:
        """Compute edge weights between nodes"""
        if not self.graph:
            return {}
        
        weights = {}
        
        for i, node1 in enumerate(nodes):
            for node2 in nodes[i+1:]:
                if self.graph.has_edge(node1, node2):
                    edge_data = self.graph.edges[node1, node2]
                    weight = edge_data.get("weight", 1.0)
                    weights[(node1, node2)] = weight
        
        return weights
    
    async def find_shortest_path(self, source: str, target: str) -> Optional[List[str]]:
        """Find shortest path between two nodes"""
        if not self.graph or source not in self.graph or target not in self.graph:
            return None
        
        try:
            path = nx.shortest_path(self.graph, source, target)
            return path
        except nx.NetworkXNoPath:
            return None
    
    async def get_node_neighbors(self, node: str, max_neighbors: int = 10) -> List[Dict]:
        """Get neighbors of a specific node"""
        if not self.graph or node not in self.graph:
            return []
        
        neighbors = []
        for neighbor in self.graph.neighbors(node):
            edge_data = self.graph.edges[node, neighbor]
            neighbor_data = self.graph.nodes[neighbor]
            
            neighbors.append({
                "id": neighbor,
                "label": neighbor_data.get("label", neighbor),
                "type": neighbor_data.get("type", "unknown"),
                "relationship": edge_data.get("relationship", "related"),
                "weight": edge_data.get("weight", 1.0)
            })
        
        # Sort by weight and return top neighbors
        neighbors.sort(key=lambda x: x["weight"], reverse=True)
        return neighbors[:max_neighbors]
    
    def get_stats(self) -> Dict:
        """Get knowledge graph statistics"""
        if not self.graph:
            return {"status": "not_initialized"}
        
        return {
            "status": "initialized",
            "nodes": self.graph.number_of_nodes(),
            "edges": self.graph.number_of_edges(),
            "triplets": len(self.triplets) if self.triplets else 0,
            "diseases": len(self.disease_ontology) if self.disease_ontology else 0,
            "density": nx.density(self.graph),
            "is_connected": nx.is_connected(self.graph)
        }

# Global instance
kg_client = KnowledgeGraphClient()