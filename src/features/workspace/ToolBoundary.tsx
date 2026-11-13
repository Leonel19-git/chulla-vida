import { Component, type ReactNode } from 'react';

/** A failing optional panel must leave the main catalog usable. */
export class ToolBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <aside role="alert" className="tool-recovery"><strong>No se pudo abrir una herramienta.</strong><p>El catálogo sigue disponible. Recarga para volver a cargar las herramientas y tus datos guardados.</p><button className="button button-secondary" onClick={() => window.location.reload()}>Recargar herramientas</button></aside> : this.props.children;
  }
}
