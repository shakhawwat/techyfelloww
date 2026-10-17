// Based on Full Project Documentation sections 2, 4, 5 and 10, plus the Step 13 scope.
// Proposed discussion scopes, not claims of completed work, availability or agreed deliverables.
export type ServiceGroup = 'solutions' | 'consulting' | 'institutional';
export type ServiceIcon = 'robot' | 'chip' | 'vision' | 'automation' | 'prototype' | 'capstone' | 'research' | 'startup' | 'school' | 'university' | 'industry';
export type ContentBlock = { title: string; text?: string; items?: readonly string[] };
export type RelatedReference = { kind: 'projects' | 'research'; slug: string };
export type ServiceDefinition = {processSteps?:{title:string;text:string}[];pathways?:import('./solution-projects').ProjectPathway[];
  media?:{url:string;altText:string};faqs?:{question:string;answer:string}[];inquiryHref?:string;mentorSlugs?:string[];
  slug: string; title: string; summary: string; icon: ServiceIcon;
  audience: readonly string[]; blocks: readonly ContentBlock[];
  deliverables: readonly string[]; responsibilities: readonly string[];
  integrity?: string; related: readonly RelatedReference[];
};
export type GroupDefinition = {processSteps?:{title:string;text:string}[];heading?:string;programs?:import('@/lib/public/editorial').EditorialPage[];faqs?:{question:string;answer:string}[];inquiryHref?:string; title: string; eyebrow: string; summary: string; audienceTitle: string; items: readonly ServiceDefinition[] };
export const serviceCopy = {
  proposed: 'Proposed service scope',
  notice: 'These pages describe proposed scopes for discussion. Deliverables, timelines, availability and commercial terms must be agreed before any engagement.',
  deliverables: 'Proposed deliverables', deliverablesNote: 'Indicative outputs for scoping. The final deliverables depend on an agreed brief.',
  responsibilities: 'Client responsibilities', process: 'Proposed process',
  processSteps: [
    { title: 'Clarify the brief', text: 'Describe the problem, intended use, current stage and constraints.' },
    { title: 'Review scope', text: 'Discuss available data, hardware, facilities and the proposed technical approach.' },
    { title: 'Agree the work', text: 'Confirm responsibilities, deliverables, review criteria and terms before work is scheduled.' },
    { title: 'Review the agreed outputs', text: 'Use the agreed criteria to review implementation notes, prototypes or training material.' },
  ],
  faqTitle: 'Questions before an inquiry',
  faqs: [
    { question: 'What should a project brief include?', answer: 'Include your organization, project type, problem, current stage, available data or hardware, and any budget or timeline constraints you want to discuss.' },
    { question: 'Does this page confirm availability or a booking?', answer: 'Availability, scheduling and commercial terms require confirmation. This website does not offer confirmed bookings.' },
    { question: 'Where can I review completed work?', answer: 'Published project and research records describe documented work. The proposed scopes and deliverables on these pages are not completed-work claims.' },
  ],
  inquiryTitle: 'Build With Us.', inquiryText: 'Start with the problem, the context and the support you want to discuss.', inquiryLabel: 'Send an inquiry', inquiryHref: '/build-with-us',
  inquiryAvailability: 'Submit an inquiry for review. Email notifications are not enabled; availability requires separate confirmation.',
  relatedTitle: 'Related published work', relatedNote: 'Approved references to published records; proposed service scopes remain separate.',
  institutionalTitle: 'Planning for an institution?', institutionalText: 'Explore lab setup, workshops, training, research collaboration and procurement inquiries.',
  institutionalLink: 'Explore institutional pathways', browseLabel: 'Explore the proposed scope',
  integrityTitle: 'Academic responsibility',
  integrity: 'Students remain responsible for their assessed academic work. Mentorship supports understanding, planning and implementation discussions. Students must follow their institution’s academic integrity rules and disclose external assistance where required.',
} as const;

export const serviceGroups = {
  solutions: {
    title: 'Solutions', eyebrow: 'Engineering',
    summary: 'Proposed engineering pathways for robotics, IoT and embedded systems, AI and vision, automation and prototyping.',
    audienceTitle: 'Suitable customers',
    items: [
      { slug: 'robotics', title: 'Robotics engineering', icon: 'robot', summary: 'Discuss a robotic system from its intended task through sensing, control and prototype integration.',
        audience: ['Businesses and startups exploring a robotic application.', 'Research teams defining a physical system or experimental platform.'],
        blocks: [
          { title: 'Problems to discuss', items: ['Turning an application idea into a defined system requirement.', 'Connecting sensing, movement and control within a prototype.'] },
          { title: 'Proposed capabilities', items: ['System and interface planning.', 'Control and sensing integration discussions.', 'Prototype evaluation and technical documentation.'] },
        ], deliverables: ['System scope and interface outline.', 'Agreed prototype or implementation notes.', 'A review plan and documented observations.'],
        responsibilities: ['Describe the intended task and operating context.', 'Share available hardware, constraints and existing work.', 'Agree evaluation criteria and access to required resources.'], related: [] },
      { slug: 'iot-embedded', title: 'IoT & embedded systems', icon: 'chip', summary: 'Scope connected devices, embedded interfaces and the path from sensing to useful system data.',
        audience: ['Businesses planning connected-device applications.', 'Startups and researchers working with sensors and embedded hardware.'],
        blocks: [
          { title: 'Problems to discuss', items: ['Defining device inputs, outputs and connectivity requirements.', 'Connecting hardware behavior with data collection and integration needs.'] },
          { title: 'Proposed capabilities', items: ['Embedded interface and firmware planning.', 'Sensor and connectivity integration discussions.', 'Data flow and prototype validation planning.'] },
        ], deliverables: ['Device requirements and interface outline.', 'Agreed firmware or connected-device prototype scope.', 'Integration notes and a validation plan.'],
        responsibilities: ['Describe the environment, power and connectivity constraints.', 'Identify available devices and data requirements.', 'Provide permitted access to hardware and existing interfaces.'], related: [] },
      { slug: 'ai-vision', title: 'AI & vision', icon: 'vision', summary: 'Discuss AI implementation and vision tasks using the data, hardware and evaluation context available to your project.',
        audience: ['Businesses and startups evaluating an AI application.', 'Research teams exploring vision or physical-system intelligence.'],
        blocks: [
          { title: 'Problems to discuss', items: ['Clarifying the task and the role of AI within a system.', 'Understanding available data, inputs and evaluation criteria.'] },
          { title: 'Proposed capabilities', items: ['Data and task feasibility discussions.', 'Vision pipeline and system integration planning.', 'Prototype evaluation against agreed criteria.'] },
        ], deliverables: ['Task definition and data requirements.', 'Agreed implementation or prototype scope.', 'Evaluation notes that document observed limitations.'],
        responsibilities: ['Share the intended use and available data.', 'Confirm permissions to use data and imagery.', 'Agree evaluation criteria and deployment constraints.'], related: [] },
      { slug: 'automation', title: 'Automation', icon: 'automation', summary: 'Review a repeatable process and discuss how sensing, controls and connected systems could support it.',
        audience: ['Businesses reviewing a manual or disconnected process.', 'Industry teams scoping a technical automation project.'],
        blocks: [
          { title: 'Problems to discuss', items: ['Describing the current process and its constraints.', 'Identifying interfaces and review criteria before selecting an approach.'] },
          { title: 'Proposed capabilities', items: ['Process and system interface planning.', 'Sensing and control integration discussions.', 'Prototype validation and handover documentation planning.'] },
        ], deliverables: ['Current-process and proposed-system outline.', 'Agreed integration or prototype scope.', 'Review criteria and technical notes.'],
        responsibilities: ['Describe the existing process and operating requirements.', 'Identify system owners and available interfaces.', 'Agree review criteria and access to relevant facilities.'], related: [] },
      { slug: 'prototyping', title: 'Prototyping', icon: 'prototype', summary: 'Turn an engineering idea into a bounded prototype brief with clear questions to explore.',
        audience: ['Startups evaluating an engineering concept.', 'Businesses and researchers preparing an early physical-system prototype.'],
        blocks: [
          { title: 'Problems to discuss', items: ['Defining what a prototype needs to demonstrate.', 'Separating assumptions from observations before further development.'] },
          { title: 'Proposed capabilities', items: ['Concept and interface review.', 'Hardware and software integration planning.', 'Iteration and evaluation discussions.'] },
        ], deliverables: ['Prototype brief and agreed evaluation questions.', 'Agreed demonstration or implementation scope.', 'Technical notes and documented observations.'],
        responsibilities: ['Share the concept, constraints and existing work.', 'Identify available hardware, data and resources.', 'Agree what the prototype should and should not be used to evaluate.'], related: [] },
    ],
  },
  consulting: {
    title: 'Consulting', eyebrow: 'Technical conversations',
    summary: 'Proposed consulting scopes for capstone projects, research implementation and startup engineering.',
    audienceTitle: 'Who this is for',
    items: [
      { slug: 'capstone', title: 'Capstone mentorship', icon: 'capstone', summary: 'Discuss project planning, technical understanding and implementation questions while retaining responsibility for your own academic work.',
        audience: ['Students and student teams planning a capstone project.'],
        blocks: [{ title: 'Proposed scope', items: ['Clarifying the problem and planning the technical work.', 'Discussing implementation choices and reviewing your own progress.', 'Identifying questions to take back to your academic supervisor.'] }],
        deliverables: ['Agreed mentoring discussion scope.', 'Planning notes and suggested technical review questions.', 'Feedback on work prepared by the student team.'],
        responsibilities: ['Remain responsible for your assessed work and submissions.', 'Share institutional requirements and supervisor guidance.', 'Complete your own implementation and disclose external assistance where required.'],
        integrity: serviceCopy.integrity, related: [] },
      { slug: 'research', title: 'Research implementation consulting', icon: 'research', summary: 'Discuss a research domain, its current stage and the data or hardware needed for implementation.',
        audience: ['Researchers defining an implementation question.', 'University and research teams scoping technical collaboration.'],
        blocks: [{ title: 'Proposed scope', items: ['Reviewing the domain, methods and expected technical output.', 'Discussing available data, hardware and implementation constraints.', 'Planning evaluation and documenting implementation decisions.'] }],
        deliverables: ['Research implementation brief.', 'Agreed prototype, technical notes or evaluation scope.', 'Documentation of implementation decisions and observations.'],
        responsibilities: ['Define the research question and current stage.', 'Confirm permissions for data, hardware and disclosure.', 'Retain responsibility for research claims, attribution and publication decisions.'], related: [] },
      { slug: 'startup', title: 'Startup engineering consulting', icon: 'startup', summary: 'Explore the engineering assumptions behind a startup idea and define a technical next step.',
        audience: ['Founders and startup teams evaluating a physical-system concept.'],
        blocks: [{ title: 'Proposed scope', items: ['Clarifying the intended application and technical constraints.', 'Reviewing system architecture and prototype options.', 'Separating business assumptions from technical evaluation questions.'] }],
        deliverables: ['Technical scoping notes.', 'Agreed prototype or architecture review scope.', 'Evaluation questions and proposed development priorities.'],
        responsibilities: ['Share the application context and existing work.', 'Identify constraints, resources and business assumptions.', 'Agree priorities and retain ownership of commercial decisions.'], related: [] },
    ],
  },
  institutional: {
    title: 'Institutional services', eyebrow: 'For institutions',
    summary: 'Proposed pathways for schools, universities and industry: lab planning, workshops, training, research collaboration and procurement discussions.',
    audienceTitle: 'Institutional context',
    items: [
      { slug: 'schools', title: 'Schools', icon: 'school', summary: 'Discuss a school’s lab, workshop and technical learning needs around learner level, facilities and participant requirements.',
        audience: ['Schools planning labs, workshops or technical training.'],
        blocks: [
          { title: 'Lab planning', items: ['Review learner level, learning objectives and available facilities.', 'Discuss a lab setup and equipment outline appropriate to the brief.'] },
          { title: 'Workshops & training', items: ['Define topics, participant count and delivery context.', 'Discuss workshop activities and material suited to the learning objectives.'] },
          { title: 'Research collaboration', text: 'Discuss institution-led exploratory projects where appropriate to learner level and school requirements.' },
          { title: 'Procurement inquiries', text: 'Prepare an equipment or kit brief with quantities, facilities, billing requirements and delivery location for a procurement discussion.' },
        ], deliverables: ['Indicative lab or equipment planning outline.', 'Proposed workshop or training outline.', 'A scoped procurement brief for review.'],
        responsibilities: ['Identify learning objectives, learner level and participant count.', 'Share facility constraints and institutional requirements.', 'Confirm institutional oversight and procurement approvals.'], related: [] },
      { slug: 'universities', title: 'Universities', icon: 'university', summary: 'Scope university lab planning, technical training and research collaboration around departments, facilities and research needs.',
        audience: ['Universities and departments planning labs or training.', 'University research teams exploring implementation collaboration.'],
        blocks: [
          { title: 'Lab planning', items: ['Discuss teaching and research objectives with available facilities.', 'Outline equipment and interfaces for an agreed lab brief.'] },
          { title: 'Workshops & training', items: ['Review participant experience, topics and delivery context.', 'Discuss material and practical activities for the agreed objectives.'] },
          { title: 'Research collaboration', text: 'Discuss the research domain, current stage, expected deliverables and available data or hardware.' },
          { title: 'Procurement inquiries', text: 'Outline requested equipment or a bill of materials, quantities, billing requirements and delivery location for institutional review.' },
        ], deliverables: ['Indicative lab planning and equipment outline.', 'Proposed training or workshop scope.', 'Research collaboration or procurement scoping notes.'],
        responsibilities: ['Identify departmental objectives and decision makers.', 'Confirm permissions for research data, hardware and disclosure.', 'Share facility, procurement and academic requirements.'], related: [] },
      { slug: 'industry', title: 'Industry', icon: 'industry', summary: 'Discuss lab planning, technical training and research collaboration in the context of an industry team’s systems and facilities.',
        audience: ['Industry teams planning technical labs or training.', 'Organizations scoping research or engineering collaboration.'],
        blocks: [
          { title: 'Lab planning', items: ['Review technical objectives, existing systems and facilities.', 'Discuss an equipment and interface outline for the agreed use.'] },
          { title: 'Workshops & training', items: ['Define participant experience and practical topics.', 'Discuss material and activities relevant to the team’s technical context.'] },
          { title: 'Research collaboration', text: 'Discuss implementation questions, available resources and the proposed technical review criteria.' },
          { title: 'Procurement inquiries', text: 'Prepare requested equipment or a bill of materials with quantities, interface needs, billing requirements and delivery location.' },
        ], deliverables: ['Indicative lab or equipment planning notes.', 'Proposed technical training scope.', 'Research or procurement requirements for review.'],
        responsibilities: ['Share existing system context and operating constraints.', 'Confirm access to facilities and permitted technical information.', 'Identify review criteria and institutional procurement requirements.'], related: [] },
    ],
  },
} as const satisfies Record<ServiceGroup, GroupDefinition>;

export function serviceDefinition(group: ServiceGroup, slug: string): ServiceDefinition | undefined {
  return serviceGroups[group].items.find(item => item.slug === slug);
}
export function servicePath(group: ServiceGroup, service?: ServiceDefinition): string { return `/${group}${service ? `/${service.slug}` : ''}`; }
export const missingServiceCopy = { title: 'Pathway not found', text: 'This proposed pathway is not listed. Explore the available scopes below.', link: 'Explore pathways' };
