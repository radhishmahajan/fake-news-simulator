import unittest
import networkx as nx

from app.engine import make_graph, compare, simulate


class SpreadSimulationTests(unittest.TestCase):
    def test_generated_graph_is_reproducible(self):
        first = make_graph(60, "Small-world", 17)
        second = make_graph(60, "Small-world", 17)
        self.assertEqual(set(first.nodes), set(second.nodes))
        self.assertEqual({frozenset(edge) for edge in first.edges}, {frozenset(edge) for edge in second.edges})

    def test_comparison_returns_all_selected_approaches(self):
        graph = make_graph(50, "Small-world", 42)
        strategies = ["No action", "Random protection", "Most connected users", "Spread hotspots", "Fact-check key connectors"]
        results = compare(graph, 0, 0.2, 8, 4, 42, strategies)
        self.assertEqual([row["strategy"] for row in results], strategies)
        self.assertTrue(all(0 <= row["exposed"] <= row["total_nodes"] for row in results))
        self.assertTrue(all("targeted" in row for row in results))

    def test_fact_checked_connector_can_be_exposed_but_stops_spread(self):
        graph = nx.path_graph(5)
        result = simulate(graph, 0, 1.0, 8, "Fact-check key connectors", 1, 42)
        target = result["blocked_nodes"][0]
        self.assertIn(target, result["exposed_nodes"])
        self.assertLess(result["exposed"], graph.number_of_nodes())


if __name__ == "__main__":
    unittest.main()
