// 🏷️ Types

/**
 * A graph stated in the only terms counting its pieces needs: the nodes that
 * carry ink, which nodes each one reaches, and an identity for a node so two
 * arrivals at the same one are recognized as one.
 *
 * It exists because "how many connected pieces is this ink" is asked of two
 * things that share no coordinate system. A rendered document's ink lives on
 * a bounded lattice, where a node is a `"column,row"` point and a neighbor is
 * one pitch away in a straight line. A repeat unit's ink lives on the unit
 * itself, where a node is a `"row,column"` position and a step east off the
 * last column arrives at the first column of the same unit — the wrap that
 * makes a repeat repeat at all. Neither reading is a special case of the
 * other, and the walk that counts the pieces does not care which it is given:
 * it needs to enumerate nodes, follow them, and tell two of them apart.
 *
 * So the walk is written once, in {@link GraphService}, against those three
 * operations, and each caller keeps its own vocabulary rather than
 * translating into a shared one that would be wrong for one of them. `Node`
 * is the caller's own point type for that reason.
 */
export interface InkAdjacency<Node> {
  readonly key: (node: Node) => string;
  readonly neighbors: (node: Node) => readonly Node[];
  readonly nodes: readonly Node[];
}
