export type RoleDefinition = {
  id: string;
  label: string;
  keywords: string[];
  builtIn: boolean;
};

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: "programming",
    label: "Programming",
    keywords: ["programming", "programmer", "coder", "code", "python", "java", "c#", "go ", "rust", "kotlin", "swift"],
    builtIn: true,
  },
  {
    id: "frontend",
    label: "Web Front-End Development",
    keywords: ["frontend", "front-end", "front end", "react", "vue", "angular", "svelte", "typescript", "javascript", "css", "ui engineer", "web developer"],
    builtIn: true,
  },
  {
    id: "backend",
    label: "Web Backend Development",
    keywords: ["backend", "back-end", "back end", "api", "node", "django", "rails", "spring", "microservices", "server"],
    builtIn: true,
  },
  {
    id: "fullstack",
    label: "Full-Stack Development",
    keywords: ["full stack", "fullstack", "full-stack", "full stack developer"],
    builtIn: true,
  },
  {
    id: "testing",
    label: "Software Testing",
    keywords: ["qa", "quality assurance", "test engineer", "testing", "automation", "selenium", "cypress", "playwright", "sdet"],
    builtIn: true,
  },
  {
    id: "software-dev",
    label: "Software Development",
    keywords: ["software developer", "software development", "application developer"],
    builtIn: true,
  },
  {
    id: "software-eng",
    label: "Software Engineering",
    keywords: ["software engineer", "software engineering", "swe ", "engineer"],
    builtIn: true,
  },
  {
    id: "tech-support",
    label: "Technical Support",
    keywords: ["technical support", "it support", "help desk", "desktop support", "tier 1", "tier 2", "systems support"],
    builtIn: true,
  },
  {
    id: "admin",
    label: "Administrative Assistance",
    keywords: ["administrative", "admin assistant", "virtual assistant", "office administrator", "executive assistant"],
    builtIn: true,
  },
  {
    id: "customer-support",
    label: "Customer Support",
    keywords: ["customer support", "customer service", "cx ", "client support", "support specialist"],
    builtIn: true,
  },
];
