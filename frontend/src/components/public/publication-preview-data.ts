import type { ListQuery, PublicRecord } from '@/lib/public/pages';

export const publicationDemoNotice = 'Illustrative publication previews — not published papers or verified journal metrics.';
export type PublicationPreview = {illustrative?:boolean; illustrativeNotice?:string; citation?:string; id: string; title: string; abstract: string; demo: boolean; authors?: string[]; venue?: string; year?: number; doi?: string; publisherUrl?: string; domain?: string; methods?: string[]; findings?: string[]; limitations?: string[]; impactFactor?: number; metricYear?: number };

export const publicationDemos: readonly PublicationPreview[] = [
  {
    "id": "demo-publication-01",
    "title": "Knowledge Graphs for Context-Aware Language Understanding",
    "domain": "Natural language processing",
    "abstract": "Illustrative abstract: Explore how curated graph context could help resolve ambiguous language. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2024,
    "impactFactor": 2.1,
    "metricYear": 2025,
    "methods": [
      "Compare text-only encoders with graph-supported representations; audit retrieval relevance and annotation assumptions.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-02",
    "title": "Cross-Modal Fusion for Intelligent Systems",
    "domain": "Multimodal learning",
    "abstract": "Illustrative abstract: Explore how complementary signals could be combined when modalities disagree. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2025,
    "impactFactor": 2.4,
    "metricYear": 2025,
    "methods": [
      "Compare unimodal baselines with gated fusion; evaluate missing modalities and conflicting evidence.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-03",
    "title": "Embedded Vision for Autonomous Systems",
    "domain": "Embedded vision",
    "abstract": "Illustrative abstract: Explore vision-model tradeoffs under bounded embedded compute budgets. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2026,
    "impactFactor": 2.7,
    "metricYear": 2025,
    "methods": [
      "Benchmark compact models on permitted recorded inputs; plan latency, memory and uncertainty measurements.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-04",
    "title": "Knowledge-Guided Intelligent Systems",
    "domain": "Knowledge representation",
    "abstract": "Illustrative abstract: Explore constrained use of structured knowledge to support interpretable decisions. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2024,
    "impactFactor": 3.0,
    "metricYear": 2025,
    "methods": [
      "Create a small licensed knowledge base; compare constrained reasoning with a knowledge-free baseline.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-05",
    "title": "Human-Centered Multimodal Interfaces",
    "domain": "Human–computer interaction",
    "abstract": "Illustrative abstract: Explore understandable interfaces that combine text, audio and visual feedback. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2025,
    "impactFactor": 3.3,
    "metricYear": 2025,
    "methods": [
      "Prototype alternative feedback designs and prepare an optional consent-based usability study.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-06",
    "title": "Explainable Bengali Toxicity Classification",
    "domain": "Bengali language technology",
    "abstract": "Illustrative abstract: Explore transparent Bengali toxicity classification across spelling and code-mixing variations. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2026,
    "impactFactor": 2.1,
    "metricYear": 2025,
    "methods": [
      "Compare multilingual and character-based classifiers; plan attribution stability and false-positive analysis.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-07",
    "title": "Retrieval-Augmented Scientific Assistance",
    "domain": "Information retrieval",
    "abstract": "Illustrative abstract: Explore evidence-linked assistance over a bounded collection of permitted research documents. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2024,
    "impactFactor": 2.4,
    "metricYear": 2025,
    "methods": [
      "Compare keyword and embedding retrieval; review citation support and abstention on unsupported questions.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-08",
    "title": "Sensor Fusion for Mobile Robotics",
    "domain": "Robotics",
    "abstract": "Illustrative abstract: Explore robust state estimation when mobile-robot sensors differ in timing and noise. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2025,
    "impactFactor": 2.7,
    "metricYear": 2025,
    "methods": [
      "Compare filtering and learned fusion on simulated sensor streams; inject timing offsets and dropouts.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-09",
    "title": "Lightweight Models for Edge Intelligence",
    "domain": "Edge AI",
    "abstract": "Illustrative abstract: Explore compact models that fit limited memory and processing budgets. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2026,
    "impactFactor": 3.0,
    "metricYear": 2025,
    "methods": [
      "Compare quantized and compact architectures on identical workloads; plan quality and runtime profiling.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-10",
    "title": "Multimodal Emotion Representation",
    "domain": "Multimodal learning",
    "abstract": "Illustrative abstract: Explore uncertainty-aware representations of contextual emotion cues without diagnostic claims. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2024,
    "impactFactor": 3.3,
    "metricYear": 2025,
    "methods": [
      "Compare audio and text baselines with fusion using consented datasets and speaker-separated evaluation.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-11",
    "title": "Robust Low-Resource Language Learning",
    "domain": "Natural language processing",
    "abstract": "Illustrative abstract: Explore adaptation strategies when labeled language data is scarce. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2025,
    "impactFactor": 2.1,
    "metricYear": 2025,
    "methods": [
      "Compare multilingual transfer and parameter-efficient tuning with fixed annotation budgets and leakage checks.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-12",
    "title": "Federated Intelligence for IoT Networks",
    "domain": "Distributed machine learning",
    "abstract": "Illustrative abstract: Explore federated model behavior with uneven data and intermittent device connectivity. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2026,
    "impactFactor": 2.4,
    "metricYear": 2025,
    "methods": [
      "Simulate heterogeneous clients and dropouts; compare local-only and federated learning under communication limits.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-13",
    "title": "Vision-Based Agricultural Monitoring",
    "domain": "Agricultural technology",
    "abstract": "Illustrative abstract: Explore image-based monitoring that documents uncertainty under changing field conditions. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2024,
    "impactFactor": 2.7,
    "metricYear": 2025,
    "methods": [
      "Use permitted agricultural imagery; compare simple vision baselines and controlled lighting perturbations.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-14",
    "title": "Adaptive Control for Educational Robots",
    "domain": "Educational robotics",
    "abstract": "Illustrative abstract: Explore bounded feedback control for understandable educational robot activities. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2025,
    "impactFactor": 3.0,
    "metricYear": 2025,
    "methods": [
      "Compare fixed and adaptive controllers in simulation; define safety constraints before hardware exercises.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-15",
    "title": "Knowledge-Aware Cyberbullying Detection",
    "domain": "Online safety research",
    "abstract": "Illustrative abstract: Explore contextual detection of harmful language while documenting ambiguity and moderation limits. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2026,
    "impactFactor": 3.3,
    "metricYear": 2025,
    "methods": [
      "Compare text-only and knowledge-supported baselines on licensed de-identified examples; review annotation disagreement.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-16",
    "title": "Energy-Efficient Embedded Inference",
    "domain": "Embedded systems",
    "abstract": "Illustrative abstract: Explore practical measurement of energy and latency for embedded model inference. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2024,
    "impactFactor": 2.1,
    "metricYear": 2025,
    "methods": [
      "Pin device and toolchain settings; compare model compression approaches using a repeatable workload and power meter.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-17",
    "title": "Trustworthy Human–Robot Collaboration",
    "domain": "Human–robot interaction",
    "abstract": "Illustrative abstract: Explore interfaces that communicate robot uncertainty and preserve human control. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2025,
    "impactFactor": 2.4,
    "metricYear": 2025,
    "methods": [
      "Prototype simulated handover and fallback scenarios; prepare a voluntary study protocol with clear safety boundaries.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-18",
    "title": "Graph-Based Research Discovery",
    "domain": "Information retrieval",
    "abstract": "Illustrative abstract: Explore interpretable navigation of a permitted graph of research topics and references. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2026,
    "impactFactor": 2.7,
    "metricYear": 2025,
    "methods": [
      "Construct a licensed reference graph; compare keyword retrieval with bounded graph traversal and manual relevance review.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-19",
    "title": "Accessible Interfaces for Technical Learning",
    "domain": "Accessible education",
    "abstract": "Illustrative abstract: Explore alternatives to technical learning interfaces that assume uniform visual or device access. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2024,
    "impactFactor": 3.0,
    "metricYear": 2025,
    "methods": [
      "Prototype keyboard, text and audio pathways; plan accessibility audits and optional consent-based feedback.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  },
  {
    "id": "demo-publication-20",
    "title": "Evaluation Frameworks for Applied AI",
    "domain": "AI evaluation",
    "abstract": "Illustrative abstract: Explore reproducible evaluation that separates benchmark performance from deployment claims. This is a proposed layout concept, not an accepted or published paper.",
    "authors": [
      "Illustrative Author A",
      "Illustrative Author B"
    ],
    "venue": "Example Journal",
    "year": 2025,
    "impactFactor": 3.3,
    "metricYear": 2025,
    "methods": [
      "Define task-specific baselines, dataset splits and uncertainty reporting; compare failure analysis across controlled scenarios.",
      "Define a baseline, validation split and limitations before conducting any experiments."
    ],
    "demo": true
  }
];

export function publishedPreview(record: PublicRecord): PublicationPreview {
  return { id: record.slug, title: record.title, abstract: record.abstract??record.summary, citation:record.citation, illustrative:record.illustrative, illustrativeNotice:record.illustrativeNotice, demo: false, authors: record.authors, venue: record.venue, year: record.year, doi: record.doi, publisherUrl: record.publisherUrl, domain: record.domain, methods: record.methods, findings: record.results };
}

export function selectPublicationDemos(query: ListQuery) {
  const records = publicationDemos.filter(entry => (!query.values.author || entry.authors?.includes(query.values.author)) && (!query.values.venue || entry.venue === query.values.venue) && (!query.values.year || entry.year === Number(query.values.year)));
  if (query.sort === 'title' || query.sort === '-title') records.sort((a, b) => a.title.localeCompare(b.title, 'en') * (query.sort === '-title' ? -1 : 1));
  if (query.sort === 'year' || query.sort === '-year') records.sort((a, b) => ((a.year ?? 0) - (b.year ?? 0)) * (query.sort === '-year' ? -1 : 1) || a.id.localeCompare(b.id));
  // No publication dates are invented; date sorts retain the defined preview order.
  return records;
}
