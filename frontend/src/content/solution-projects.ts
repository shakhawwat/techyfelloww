import { serviceGroups, type ServiceDefinition } from './services';

export type SolutionSlug = typeof serviceGroups.solutions.items[number]['slug'];
export type ProjectPathway = {
  title: string;
  description: string;
  problems: string[];
  approach: string;
  capabilities: string[];
  deliverables: string[];
  requirements: string[];
  evaluation: string;
};
type PathwaySelection = {
  title: string; description: string; approach: string; evaluation: string;
  problems: number[]; capabilities: number[]; deliverables: number[]; requirements: number[];
};
// Discussion pathways derived from the existing service copy, not delivered projects
// or additional commitments. Indices select the original scope statements verbatim.
const selections: Record<SolutionSlug, PathwaySelection[]> = {
  robotics: [
    { title: 'Robotic application prototypes',
      description: 'Define an intended robotic task and the interfaces a prototype would need to explore. This pathway suits businesses and startups turning an application idea into a system brief.',
      approach: 'Review the intended task and system interfaces before agreeing the prototype scope.',
      evaluation: 'What task should the prototype demonstrate, and which observations would meet the agreed review criteria?',
      problems: [0], capabilities: [0, 2], deliverables: [0, 1, 2], requirements: [0, 1, 2] },
    { title: 'Sensing and control integration',
      description: 'Discuss how sensing, movement and control connect within a robotic prototype. This pathway suits a project with available hardware and integration questions to review.',
      approach: 'Review sensing, movement and control interfaces in the context of the available hardware.',
      evaluation: 'Which interfaces need review, and how will their behavior be observed within the agreed prototype scope?',
      problems: [1], capabilities: [0, 1], deliverables: [0, 1], requirements: [0, 1, 2] },
    { title: 'Research robotic platforms',
      description: 'Define a physical system or experimental platform for a research context. This pathway suits research teams planning a prototype and a documented review of its behavior.',
      approach: 'Discuss the system requirements, available hardware and criteria for reviewing the prototype.',
      evaluation: 'What observations should the review document, and what resources are required to make that review meaningful?',
      problems: [0, 1], capabilities: [0, 2], deliverables: [0, 2], requirements: [0, 1, 2] },
  ],
  'iot-embedded': [
    { title: 'Connected-device prototypes',
      description: 'Discuss the inputs, outputs and connectivity needed for a connected-device application. This pathway suits businesses preparing a device brief around available hardware and data requirements.',
      approach: 'Review device requirements and connectivity before defining an agreed connected-device prototype scope.',
      evaluation: 'Which device inputs and outputs need to be validated, and what connectivity constraints must the review account for?',
      problems: [0], capabilities: [0, 1], deliverables: [0, 1], requirements: [0, 1, 2] },
    { title: 'Embedded device integration',
      description: 'Explore how embedded interfaces and firmware relate to the required hardware behavior. This pathway suits startups and researchers working with existing devices and permitted access to their interfaces.',
      approach: 'Review hardware interfaces and firmware planning against the environment, power and connectivity constraints.',
      evaluation: 'Which interface behavior should be reviewed, and what access is available to validate it?',
      problems: [0, 1], capabilities: [0], deliverables: [0, 1, 2], requirements: [0, 2] },
    { title: 'Sensor data integration',
      description: 'Scope the path from sensor behavior to useful collected system data. This pathway suits a connected-device prototype with sensor, connectivity and data-flow questions to validate.',
      approach: 'Discuss sensor and connectivity integration alongside a data-flow validation plan.',
      evaluation: 'What data is required, and which observations would demonstrate the agreed integration behavior?',
      problems: [1], capabilities: [1, 2], deliverables: [0, 2], requirements: [0, 1, 2] },
  ],
  'ai-vision': [
    { title: 'Vision task implementation',
      description: 'Clarify a vision task and how it would fit within the wider system. This pathway suits businesses or research teams with data, imagery and an implementation question to discuss.',
      approach: 'Review the task and available data before planning a vision pipeline and its system interfaces.',
      evaluation: 'What task should the implementation address, and what data permissions and review criteria apply?',
      problems: [0, 1], capabilities: [0, 1], deliverables: [0, 1], requirements: [0, 1, 2] },
    { title: 'AI evaluation and integration',
      description: 'Discuss the role of AI in an application and how a prototype would be evaluated. This pathway suits a project that needs agreed criteria and clear documentation of observed limitations.',
      approach: 'Discuss system integration and prototype evaluation in the context of available data and deployment constraints.',
      evaluation: 'Which criteria should the prototype be evaluated against, and how will observed limitations be documented?',
      problems: [0, 1], capabilities: [1, 2], deliverables: [1, 2], requirements: [0, 1, 2] },
  ],
  automation: [
    { title: 'Process and interface planning',
      description: 'Describe a manual or disconnected process and the interfaces an automation approach would need to consider. This pathway suits businesses defining the current process and its operating constraints.',
      approach: 'Review the existing process, system owners and interfaces before selecting a proposed approach.',
      evaluation: 'Which process requirements and interface constraints must the proposed system be reviewed against?',
      problems: [0, 1], capabilities: [0], deliverables: [0, 2], requirements: [0, 1, 2] },
    { title: 'Sensor-based control',
      description: 'Discuss how sensing and controls could support a repeatable process. This pathway suits an industry team with operating requirements and relevant facilities to review.',
      approach: 'Discuss sensing and control interfaces alongside the agreed integration scope and review criteria.',
      evaluation: 'What behavior should the controls support, and what access is needed to review it against the agreed criteria?',
      problems: [0, 1], capabilities: [0, 1], deliverables: [1, 2], requirements: [0, 1, 2] },
    { title: 'Connected automation prototypes',
      description: 'Scope how connected systems could support an existing process through a bounded prototype. This pathway suits a team preparing integration questions, validation criteria and technical handover notes.',
      approach: 'Discuss connected-system interfaces, prototype validation and the documentation needed for the agreed scope.',
      evaluation: 'Which integration behavior should the prototype demonstrate, and what technical notes are needed for review and handover?',
      problems: [1], capabilities: [0, 2], deliverables: [0, 1, 2], requirements: [0, 1, 2] },
  ],
  prototyping: [
    { title: 'Concept and requirements review',
      description: 'Define what an engineering concept needs to demonstrate and which assumptions need review. This pathway suits startups, businesses and researchers preparing an early prototype brief.',
      approach: 'Review the concept and interfaces, then agree the questions the prototype should explore.',
      evaluation: 'What should the prototype demonstrate, and which assumptions can be reviewed through documented observations?',
      problems: [0, 1], capabilities: [0], deliverables: [0], requirements: [0, 1, 2] },
    { title: 'Proof-of-concept integration',
      description: 'Discuss the hardware and software integration needed for a bounded demonstration. This pathway suits an early physical-system concept with available hardware, data and resources.',
      approach: 'Discuss integration planning against an agreed demonstration or implementation scope.',
      evaluation: 'Which integration questions should the demonstration explore, and what should it not be used to evaluate?',
      problems: [0], capabilities: [0, 1], deliverables: [0, 1], requirements: [0, 1, 2] },
    { title: 'Prototype testing and documentation',
      description: 'Plan iteration and evaluation around the questions in a prototype brief. This pathway suits a project that needs to separate assumptions from observations and document the technical review.',
      approach: 'Discuss evaluation and iteration using agreed questions, then document the observations and technical notes.',
      evaluation: 'Which observations answer the agreed questions, and what limits should be recorded before further development?',
      problems: [1], capabilities: [2], deliverables: [0, 2], requirements: [0, 1, 2] },
  ],
};
export function solutionProjects(service: ServiceDefinition & { slug: SolutionSlug }): ProjectPathway[] {
  if(service.pathways)return service.pathways;
  const select = (items: readonly string[], indices: number[]) => indices.flatMap(index => items[index] ? [items[index]] : []);
  return selections[service.slug].map(pathway => ({
    title: pathway.title, description: pathway.description, approach: pathway.approach, evaluation: pathway.evaluation,
    problems: select(service.blocks[0]?.items ?? [], pathway.problems),
    capabilities: select(service.blocks[1]?.items ?? [], pathway.capabilities),
    deliverables: select(service.deliverables, pathway.deliverables),
    requirements: select(service.responsibilities, pathway.requirements),
  }));
}
