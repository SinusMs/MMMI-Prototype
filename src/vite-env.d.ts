/// <reference types="vite/client" />

declare module '*.vert?url&raw' {
  const content: string;
  export default content;
}

declare module '*.frag?url&raw' {
  const content: string;
  export default content;
}