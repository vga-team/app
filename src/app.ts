import { html, css, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { when } from "lit/directives/when.js";
import "vga-vis-host";
import { GWFVisHostConfig } from "vga-vis-host";

@customElement("vga-app")
export class VGAApp extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .logo {
      display: block;
      margin: auto;
      max-width: 100vw;
    }
    gwf-vis-ui-button {
      display: block;
      width: fit-content;
      margin: 10px auto;
    }
  `;

  @state()
  config?: GWFVisHostConfig;

  async firstUpdated() {
    const configUrl = new URLSearchParams(location.search).get("configUrl");
    if (configUrl) {
      this.config = await fetch(configUrl).then((response) => response.json());
    }

    if (
      "launchQueue" in window &&
      "files" in (window as any).LaunchParams.prototype
    ) {
      (window as any).launchQueue.setConsumer((launchParams: any) => {
        // Nothing to do when the queue is empty.
        if (!launchParams.files.length) {
          return;
        }
        for (const fileHandle of launchParams.files) {
          this.loadConfigFile(fileHandle);
        }
      });
    }
  }

  render() {
    return html`${when(
      this.config,
      () =>
        html`<gwf-vis-host
          allow-modifying-page-info
          .config=${this.config}
        ></gwf-vis-host>`,
      () => this.renderUI()
    )}`;
  }

  private renderUI() {
    return html`
      <img class="logo" src="./icons/vga-512x512.png" alt="VGA App" />
      <gwf-vis-ui-button @click=${() => this.loadConfigFile()}>
        Load Config File
      </gwf-vis-ui-button>
      <gwf-vis-ui-button @click=${() => this.openConfigURL()}>
        Open Config URL
      </gwf-vis-ui-button>
    `;
  }

  private async loadConfigFile(fileHandle?: FileSystemFileHandle) {
    if (!fileHandle) {
      [fileHandle] = (await (window as any).showOpenFilePicker({
        types: [
          {
            description: "VGA Config File",
            accept: {
              "application/json": [".vgaconf"],
            },
          },
        ],
      })) as FileSystemFileHandle[];
    }
    const file = await fileHandle?.getFile();
    const jsonText = await file?.text();
    if (jsonText) {
      this.config = JSON.parse(jsonText);
    }
  }

  private openConfigURL() {
    const url = prompt("Enter the URL: ");
    if (!url) {
      alert("No content.");
    }
    location.search = "?configUrl=" + url;
  }
}
