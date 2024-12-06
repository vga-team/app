import { html, css, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { until } from "lit/directives/until.js";
import { when } from "lit/directives/when.js";
import * as kv from "idb-keyval";
import "vga-core";
import { VGAConfig } from "vga-core";
import demos from "./assets/demos.json";

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
    header {
      position: sticky;
      top: 0;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.5em;
      background-color: hsl(0, 0%, 100%);
      z-index: 100;
      box-shadow: 0 0 5px hsl(0, 0%, 0%, 0.5);
      & > :nth-child(1) {
        margin: auto;
        max-width: 5em;
      }
      & > :nth-child(2) {
        font-size: 1.5em;
        font-weight: bold;
        margin-block: auto;
      }
      & > :nth-child(3) {
        display: grid;
        grid-template-rows: auto;
        padding: 0.5em;
        vga-ui-button {
          margin: auto;
          height: fit-content;
          width: fit-content;
        }
      }
    }
    .intro {
      background-image: url(./teaser.jpg);
      background-size: cover;
      & .intro-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1em;
        padding: 1em;
        max-width: 1200px;
        margin-inline: auto;
        padding-block: 3em;
        @media only screen and (max-width: 768px) {
          grid-template-columns: 100%;
        }
        & > div {
          border-radius: 10px;
          box-shadow: 1px 1px 2px 1px hsl(0, 0%, 0%, 0.5);
          padding: 1em;
          user-select: none;
          background-color: hsl(0, 0%, 100%);
          opacity: 0.8;
          & > h3 {
            text-align: center;
          }
        }
      }
      & details {
        background-color: hsl(0, 0%, 100%);
        opacity: 0.8;
      }
    }
    details {
      padding: 1em;
      & > summary {
        user-select: none;
        cursor: pointer;
        font-size: 1.5em;
        font-weight: bold;
      }
    }
    .demos {
      display: flex;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 0.5em;
      gap: 0.5em;
      & > .demo-card {
        all: initial;
        flex: 0 0 auto;
        font-family: inherit;
        overflow: hidden;
        position: relative;
        display: block;
        height: 150px;
        width: 150px;
        background-size: 80%;
        background-repeat: no-repeat;
        background-position: center;
        border-radius: 10px;
        box-shadow: 1px 1px 2px 1px hsl(0, 0%, 0%, 0.5);
        cursor: pointer;
        &:hover {
          box-shadow: 1px 1px 5px 2px hsl(0, 0%, 0%, 0.5);
        }
        &:active {
          box-shadow: inset 1px 1px 5px 2px hsl(0, 0%, 0%, 0.5);
        }
        & > div {
          position: absolute;
          display: block;
          bottom: 0;
          margin-inline: auto;
          text-align: center;
          width: 100%;
          background-color: hsl(0, 0%, 80%);
          opacity: 0.8;
        }
      }
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
      gap: 0.5em;
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
        overflow: hidden;
        max-width: 100%;
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
  config?: VGAConfig;

  @state()
  visHostBaseUrl?: string;

  private loadConfigDialogRef = createRef<HTMLDialogElement>();

  async firstUpdated() {
    if (history.state?.config) {
      this.visHostBaseUrl = history.state.visHostBaseUrl;
      this.config = history.state.config;
      history.replaceState({}, "");
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
        html`<vga-core
          allow-modifying-page-info
          .configBaseUrl=${this.visHostBaseUrl}
          .config=${this.config}
        ></vga-core>`,
      () => this.renderUI()
    )}`;
  }

  private renderUI() {
    return html`
      ${this.renderHeader()} ${this.renderIntro()} ${this.renderDemos()}
      ${this.renderRecents()}
    `;
  }

  private renderHeader() {
    return html`
      <header class="header">
        <img class="logo" src=${VGA_ICON_SRC} alt=${VGA_DEFAULT_NAME} />
        <span>Visualization for Geospatial Analysis</span>
        <div>
          <vga-ui-button
            @click=${() => this.loadConfigDialogRef.value?.showModal()}
          >
            Load Config
          </vga-ui-button>
          <dialog ${ref(this.loadConfigDialogRef)}>
            <vga-ui-button
              @click=${() => {
                this.loadConfigDialogRef.value?.close();
                this.loadConfigFile();
              }}
            >
              Load Config File
            </vga-ui-button>
            <vga-ui-button
              @click=${() => {
                this.loadConfigDialogRef.value?.close();
                this.openConfigURL();
              }}
            >
              Load Config URL
            </vga-ui-button>
            <vga-ui-button
              @click=${() => {
                this.loadConfigDialogRef.value?.close();
              }}
            >
              Cancel
            </vga-ui-button>
          </dialog>
        </div>
      </header>
    `;
  }

  private renderIntro() {
    return html`
      <div class="intro">
        <div class="intro-cards">
          <div>
            <h3>What is VGA?</h3>
            <ul>
              <li>
                <b>Modular Framework: </b>
                VGA is a modular framework designed for building map-based
                visualizations on the web.
              </li>
              <li>
                <b>Plugin-Based: </b>
                It uses a plugin-based architecture, allowing for flexible and
                extensible visualizations.
              </li>
              <li>
                <b>Progressive Web App: </b>
                VGA is implemented as a Progressive Web App (PWA), which uses
                the web technology but can provide some native app like
                experiences.
              </li>
            </ul>
          </div>
          <div>
            <h3>Why use VGA?</h3>
            <ul>
              <li>
                <b>Versatile Applications: </b>
                VGA caters to various user needs, from scientists to
                municipalities and government agencies, enabling diverse
                geospatial data visualizations.
              </li>
              <li>
                <b>Reduces Duplication: </b>
                By offering reusable components, VGA minimizes the duplication
                of efforts in creating custom visualization apps.
              </li>
              <li>
                <b>Enhanced Interactivity: </b>
                VGA supports interactive visualizations, making it easier to
                explore and analyze geospatial data.
              </li>
            </ul>
          </div>
          <div>
            <h3>How does VGA work?</h3>
            <ul>
              <li>
                <b>Core and Plugins:</b>
                The core of VGA acts as a host for plugins, which provide
                specific visualization functionalities.
              </li>
              <li>
                <b>Configuration-Based: </b>
                Users can load configurations to dynamically render
                visualizations, integrating multiple plugins as needed.
              </li>
              <li>
                <b>Data Integration: </b>
                VGA supports various data formats and sources, allowing for
                comprehensive and detailed geospatial visualizations.
              </li>
            </ul>
          </div>
        </div>
        <details>
          <summary>Helpful Links</summary>
          <ul>
            <li>
              <a href="https://github.com/vga-team/plugin-examples"
                >Plugin Examples</a
              >
            </li>
          </ul>
        </details>
      </div>
    `;
  }

  private renderDemos() {
    return html`
      <details open>
        <summary>DEMOs</summary>
        <div class="demos">
          ${demos.map(
            ({ label, image, href }) =>
              html`
                <a
                  class="demo-card"
                  style="background-image: url(${image});"
                  href=${href}
                >
                  <div>${label}</div>
                </a>
              `
          )}
        </div>
      </details>
    `;
  }

  private renderRecents() {
    return html`
      <details>
        <summary>Recents</summary>
        ${until(
          kv.get("recents").then((recents: RecentOpened[]) =>
            recents
              ? recents.map(
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
              : "No recent items"
          ),
          "Loading..."
        )}
      </details>
    `;
  }

  private async loadConfig(
    source?: FileSystemFileHandle | string | RecentOpened | null
  ) {
    if (!source) {
      this.visHostBaseUrl = void 0;
      return;
    }
    if (typeof source === "string") {
      this.visHostBaseUrl = this.obtainVisHostBaseUrl(source);
      this.loadConfigUrl(source);
      return;
    }
    if (source instanceof FileSystemFileHandle) {
      this.visHostBaseUrl = void 0;
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
    this.visHostBaseUrl = void 0;
  }

  private async loadConfigUrl(url?: string) {
    if (!url) {
      alert("Invalid config URL.");
      return;
    }
    this.config = await fetch(url).then((response) => response.json());
    history.pushState(
      {
        visHostBaseUrl: this.obtainVisHostBaseUrl(url),
        config: this.config,
      },
      "",
      `?configUrl=${url}`
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

  private obtainVisHostBaseUrl(url?: string) {
    if (
      !url ||
      url.startsWith("data:") ||
      url.startsWith("blob:") ||
      url.startsWith("/")
    ) {
      return void 0;
    } else if (url) {
      return new URL("./", url).href;
    }
  }
}
