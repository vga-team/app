import { html, css, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { until } from "lit/directives/until.js";
import { when } from "lit/directives/when.js";
import * as kv from "idb-keyval";
import "vga-vis-host";
import { GWFVisHostConfig } from "vga-vis-host";

const VGA_ICON_SRC = "./icons/vga-512x512.png";
const VGA_DEFAULT_NAME = "VGA App";

type RecentOpened = {
  name?: string;
  icon?: string;
  source?: FileSystemFileHandle | string;
};

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
    .recent-card {
      display: grid;
      grid-template-columns: 3em 1fr auto;
      border-radius: 10px;
      height: 3em;
      box-shadow: 1px 1px 2px 1px hsl(0, 0%, 0%, 0.5);
      margin: 5px 10px;
      padding: 5px;
      user-select: none;
      cursor: pointer;
      &:hover {
        box-shadow: 1px 1px 5px 2px hsl(0, 0%, 0%, 0.5);
      }
      &:active {
        box-shadow: inset 1px 1px 5px 2px hsl(0, 0%, 0%, 0.5);
      }
      & img {
        display: block;
        height: 2.5em;
        margin: auto;
      }
      & div {
        margin: auto auto auto 0.5em;
      }
      .remove-button {
        border: none;
        border-radius: 5px;
        cursor: pointer;
        &:hover {
          box-shadow: 1px 1px 5px 2px hsl(0, 0%, 0%, 0.5);
        }
        &:active {
          box-shadow: inset 1px 1px 5px 2px hsl(0, 0%, 0%, 0.5);
        }
      }
    }
  `;

  @state()
  config?: GWFVisHostConfig;

  async firstUpdated() {
    if (history.state?.config) {
      this.config = history.state.config;
      return;
    }
    let configSource = new URLSearchParams(location.search).get("configUrl");
    if (
      !configSource &&
      "launchQueue" in window &&
      "files" in (window as any).LaunchParams.prototype
    ) {
      (window as any).launchQueue.setConsumer((launchParams: any) => {
        // Nothing to do when the queue is empty.
        if (!launchParams.files.length) {
          return;
        }
        configSource = launchParams.files?.[0];
      });
    }
    await this.loadConfig(configSource);
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
      <img class="logo" src=${VGA_ICON_SRC} alt=${VGA_DEFAULT_NAME} />
      <gwf-vis-ui-button @click=${() => this.loadConfigFile()}>
        Load Config File
      </gwf-vis-ui-button>
      <gwf-vis-ui-button @click=${() => this.openConfigURL()}>
        Open Config URL
      </gwf-vis-ui-button>
      <hr />
      <h3>Recents</h3>
      ${until(
        kv.get("recents").then((recents: RecentOpened[]) =>
          recents?.map(
            ({ name, icon, source }, i) =>
              html`<div
                class="recent-card"
                @click=${async () => {
                  if (typeof source === "string") {
                    location.search = `?configUrl=${source}`;
                  }
                  await this.loadConfig(source);
                }}
              >
                <img
                  src=${icon ?? VGA_ICON_SRC}
                  alt=${name ?? VGA_DEFAULT_NAME}
                />
                <div>
                  ${name ?? VGA_DEFAULT_NAME} -
                  ${typeof source === "string"
                    ? `URL: ${source}`
                    : `File: ${source?.name}`}
                </div>
                <button
                  class="remove-button"
                  @click=${async (event: Event) => {
                    event.stopPropagation();
                    recents.splice(i, 1);
                    kv.set("recents", recents);
                    this.requestUpdate();
                  }}
                >
                  Remove
                </button>
              </div>`
          )
        )
      )}
    `;
  }

  private async loadConfig(
    source?: FileSystemFileHandle | string | RecentOpened | null
  ) {
    if (!source) {
      return;
    }
    if (typeof source === "string") {
      this.loadConfigUrl(source);
      return;
    }
    if (source instanceof FileSystemFileHandle) {
      const permissionStatus = await ((source as any).requestPermission({
        mode: "read",
      }) as Promise<PermissionState>);
      if (permissionStatus !== "granted") {
        alert("Permission denied for read the file.");
        return;
      }
      this.loadConfigFile(source);
      return;
    }
  }

  private async loadConfigUrl(url?: string) {
    if (!url) {
      alert("Invalid config URL.");
      return;
    }
    this.config = await fetch(url).then((response) => response.json());
    history.pushState(
      {
        config: this.config,
      },
      "",
      `?configFile=${url}`
    );
    this.updateRecents({
      name: this.config?.pageTitle,
      icon: this.config?.favicon,
      source: url,
    });
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
    this.config = JSON.parse(jsonText);
    if (jsonText) {
      history.pushState(
        { config: this.config },
        "",
        `?configFile=${fileHandle.name}`
      );
      this.updateRecents({
        name: this.config?.pageTitle,
        icon: this.config?.favicon,
        source: fileHandle,
      });
    }
  }

  private openConfigURL() {
    const url = prompt("Enter the URL: ");
    if (!url) {
      alert("No content.");
      return;
    }
    location.search = `?configUrl=${url}`;
  }

  private async updateRecents({ name, icon, source }: RecentOpened) {
    const recents =
      ((await kv.get("recents")) as RecentOpened[] | undefined) ?? [];
    let exsitingIndex = -1;
    for (let i = 0; i < recents.length; i++) {
      const recent = recents[i];
      if (
        recent.source === source ||
        (source instanceof FileSystemFileHandle &&
          (await (recent.source as any)?.isSameEntry?.(source)))
      ) {
        exsitingIndex = i;
        break;
      }
    }
    const recent =
      exsitingIndex >= 0 ? recents.splice(exsitingIndex, 1)[0] : {};
    Object.assign(recent, { name, icon, source });
    recents.unshift(recent);
    if (recents.length > 10) {
      recents.pop();
    }
    await kv.set("recents", recents);
  }
}
