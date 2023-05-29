import { html, css, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { when } from "lit/directives/when.js";
import "gwf-vis-host";
import { GWFVisHostConfig } from "../node_modules/gwf-vis-host/types/utils/gwf-vis-host-config";

@customElement("gwf-vis-app")
export class GWFVisApp extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;

  @state()
  config?: GWFVisHostConfig;

  render() {
    return html`${when(
      this.config,
      () => html`<gwf-vis-host .config=${this.config}></gwf-vis-host>`,
      () => this.renderUI()
    )}`;
  }

  private renderUI() {
    return html`
      <div style="display: flex; height: 2.5rem; justify-content: center;">
        <img src="./gwf.jpg" />
        <span style="font-size: 2rem; margin-left: 1rem;">GWF Vis App</span>
      </div>
      <gwf-vis-ui-button
        style="display: block; width: fit-content; margin: 0 auto;"
        @click=${() => this.loadConfigFile()}
      >
        Load Config File
      </gwf-vis-ui-button>
    `;
  }

  private async loadConfigFile() {
    const [fileHandle] = (await (window as any).showOpenFilePicker({
      types: [
        {
          description: "JSON",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
    })) as FileSystemFileHandle[];
    const file = await fileHandle?.getFile();
    const jsonText = await file?.text();
    if (jsonText) {
      this.config = JSON.parse(jsonText);
    }
  }
}
