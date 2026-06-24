export type Briefing = {
  targetAudience: string;
  tone: string;
  objective: string;
  promise: string;
  cta: string;
  restrictions: string;
  extra: string;
};

export type VideoScene = {
  id: string;
  title: string;
  duration: string;
  goal: string;
  onScreenText: string;
  narration: string;
  visualAction: string;
  visualDirection: string;
  cameraDirection: string;
  referenceUse: string;
  visualFidelity: string;
  transition: string;
  constraints: string;
};
