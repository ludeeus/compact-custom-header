import {
  LitElement,
  html,
  fireEvent,
  defaultConfig,
  huiRoot,
  hass
} from "./compact-custom-header.js";

const lovelace = huiRoot().lovelace;
const buttonOptions = ["show", "hide", "clock", "overflow"];
const overflowOptions = ["show", "hide", "clock"];
const swipeAnimation = ["none", "swipe", "fade", "flip"];
const previousConfig = JSON.parse(JSON.stringify(lovelace.config));
const cchConfig = lovelace.config.cch
  ? JSON.parse(JSON.stringify(lovelace.config.cch))
  : {};

export class CompactCustomHeaderEditor extends LitElement {
  static get properties() {
    return {
      _config: {}
    };
  }

  render() {
    if (this._config == undefined) this._config = cchConfig;
    const mwc_button = customElements.get("mwc-button") ? true : false;

    const close = () => {
      let editor = this.parentNode.parentNode.parentNode.querySelector(
        "editor"
      );
      this.parentNode.parentNode.parentNode.removeChild(editor);
    };
    const save = () => {
      for (var key in this._config) {
        if (this._config[key] == defaultConfig[key]) {
          delete this._config[key];
        }
      }
      let newConfig = {
        ...lovelace.config,
        ...{ cch: this._config }
      };
      try {
        lovelace.saveConfig(newConfig).then(() => {
          if (huiRoot().lovelace.config != newConfig) {
            console.log("Save failed, reverting.");
            lovelace.saveConfig(previousConfig);
          } else {
            location.reload(true);
          }
        });
      } catch (e) {
        console.log("Save failed: " + e);
      }
    };

    const save_button = mwc_button
      ? html`
          <mwc-button raised @click="${save}">Save and Reload</mwc-button>
        `
      : html`
          <paper-button raised @click="${save}">Save and Reload</paper-button>
        `;
    const cancel_button = mwc_button
      ? html`
          <mwc-button raised @click="${close}">Cancel</mwc-button>
        `
      : html`
          <paper-button raised @click="${close}">Cancel</paper-button>
        `;
    return html`
      <div @click="${close}" class="title_control">
        X
      </div>
      ${this.renderStyle()}
      <cch-config-editor
        .defaultConfig="${defaultConfig}"
        .config="${this._config}"
        @cch-config-changed="${this._configChanged}"
      >
      </cch-config-editor>
      <h4 class="underline">Exceptions</h4>
      <br />
      ${this._config.exceptions
        ? this._config.exceptions.map((exception, index) => {
            return html`
              <cch-exception-editor
                .config="${this._config}"
                .exception="${exception}"
                .index="${index}"
                @cch-exception-changed="${this._exceptionChanged}"
                @cch-exception-delete="${this._exceptionDelete}"
              >
              </cch-exception-editor>
            `;
          })
        : ""}
      <br />
      ${mwc_button
        ? html`
            <mwc-button @click="${this._addException}"
              >Add Exception
            </mwc-button>
          `
        : html`
            <paper-button @click="${this._addException}"
              >Add Exception
            </paper-button>
          `}

      <h4 class="underline">Current User</h4>
      <p style="font-size:16pt">${hass.user.name}</p>
      <h4 class="underline">Current User Agent</h4>
      <br />
      ${navigator.userAgent}
      <br />
      <br />
      ${!this.exception
        ? html`
            <br />
            ${save_button}
          `
        : ""}
      ${!this.exception
        ? html`
            ${cancel_button}
          `
        : ""}
    `;
  }

  _addException() {
    let newExceptions;
    if (this._config.exceptions) {
      newExceptions = this._config.exceptions.slice(0);
      newExceptions.push({
        conditions: {},
        config: {}
      });
    } else {
      newExceptions = [
        {
          conditions: {},
          config: {}
        }
      ];
    }
    this._config = {
      ...this._config,
      exceptions: newExceptions
    };

    fireEvent(this, "config-changed", {
      config: this._config
    });
  }

  _configChanged(ev) {
    if (!this._config) {
      return;
    }
    this._config = {
      ...this._config,
      ...ev.detail.config
    };
    fireEvent(this, "config-changed", {
      config: this._config
    });
  }

  _exceptionChanged(ev) {
    if (!this._config) {
      return;
    }
    const target = ev.target.index;
    const newExceptions = this._config.exceptions.slice(0);
    newExceptions[target] = ev.detail.exception;
    this._config = {
      ...this._config,
      exceptions: newExceptions
    };

    fireEvent(this, "config-changed", {
      config: this._config
    });
  }

  _exceptionDelete(ev) {
    if (!this._config) {
      return;
    }
    const target = ev.target;
    const newExceptions = this._config.exceptions.slice(0);
    newExceptions.splice(target.index, 1);
    this._config = {
      ...this._config,
      exceptions: newExceptions
    };

    fireEvent(this, "config-changed", {
      config: this._config
    });
    this.requestUpdate();
  }

  renderStyle() {
    return html`
      <style>
        h3,
        h4 {
          font-size: 16pt;
          margin-bottom: 5px;
          width: 100%;
        }
        paper-button {
          margin: 0;
          background-color: var(--primary-color);
          color: var(--text-primary-color, #fff);
        }
        .toggle-button {
          margin: 4px;
          background-color: transparent;
          color: var(--primary-color);
        }
        .title_control {
          color: var(--text-dark-color);
          font-weight: bold;
          font-size: 22px;
          float: right;
          cursor: pointer;
          margin: -10px -5px -5px -5px;
        }
        .user_agent {
          display: block;
          margin-left: auto;
          margin-right: auto;
          padding: 5px;
          border: 0;
          resize: none;
          width: 100%;
        }
        .underline {
          width: 100%;
          background: var(--dark-color);
          color: var(--text-dark-color);
          padding: 5px;
          width: calc(100% + 30px);
          margin-left: calc(0% - 20px);
        }
      </style>
    `;
  }
}

customElements.define(
  "compact-custom-header-editor",
  CompactCustomHeaderEditor
);

export class CchConfigEditor extends LitElement {
  static get properties() {
    return {
      defaultConfig: {},
      config: {},
      exception: {},
      _closed: {}
    };
  }

  constructor() {
    super();
    this._closed = true;
  }

  get _hide_tabs() {
    return this.config.hide_tabs || this.defaultConfig.hide_tabs || "";
  }

  get _show_tabs() {
    return this.config.show_tabs || this.defaultConfig.show_tabs || "";
  }

  get _clock() {
    return (
      this._menu == "clock" ||
      this._voice == "clock" ||
      this._notifications == "clock" ||
      this._options == "clock"
    );
  }

  get _clock_format() {
    return this.config.clock_format || this.defaultConfig.clock_format;
  }

  get _clock_am_pm() {
    return this.config.clock_am_pm !== undefined
      ? this.config.clock_am_pm
      : this.defaultConfig.clock_am_pm;
  }

  get _clock_date() {
    return this.config.clock_date !== undefined
      ? this.config.clock_date
      : this.defaultConfig.clock_date;
  }

  get _disable() {
    return this.config.disable !== undefined
      ? this.config.disable
      : this.defaultConfig.disable;
  }

  get _header() {
    return this.config.header !== undefined
      ? this.config.header
      : this.defaultConfig.header;
  }

  get _chevrons() {
    return this.config.chevrons !== undefined
      ? this.config.chevrons
      : this.defaultConfig.chevrons;
  }

  get _hide_help() {
    return this.config.hide_help || this.defaultConfig.hide_help;
  }

  get _redirect() {
    return this.config.redirect !== undefined
      ? this.config.redirect
      : this.defaultConfig.redirect;
  }

  get _kiosk_mode() {
    return this.config.kiosk_mode !== undefined
      ? this.config.kiosk_mode
      : this.defaultConfig.kiosk_mode;
  }

  get _sidebar_closed() {
    return this.config.sidebar_closed !== undefined
      ? this.config.sidebar_closed
      : this.defaultConfig.sidebar_closed;
  }

  get _sidebar_swipe() {
    return this.config.sidebar_swipe !== undefined
      ? this.config.sidebar_swipe
      : this.defaultConfig.sidebar_swipe;
  }

  get _date_locale() {
    return this.config.date_locale || this.defaultConfig.date_locale;
  }

  get _menu() {
    return this.config.menu || this.defaultConfig.menu;
  }

  get _voice() {
    return this.config.voice !== undefined
      ? this.config.voice
      : this.defaultConfig.voice;
  }

  get _notifications() {
    return this.config.notifications !== undefined
      ? this.config.notifications
      : this.defaultConfig.notifications;
  }

  get _options() {
    return this.config.options !== undefined
      ? this.config.options
      : this.defaultConfig.options;
  }

  get _swipe() {
    return this.config.swipe !== undefined
      ? this.config.swipe
      : this.defaultConfig.swipe;
  }

  get _swipe_amount() {
    return this.config.swipe_amount !== undefined
      ? this.config.swipe_amount
      : this.defaultConfig.swipe_amount;
  }

  get _swipe_animate() {
    return this.config.swipe_animate || this.defaultConfig.swipe_animate;
  }

  get _default_tab() {
    return this.config.default_tab || this.defaultConfig.default_tab;
  }

  get _swipe_skip() {
    return this.config.swipe_skip || this.defaultConfig.swipe_skip;
  }

  get _swipe_wrap() {
    return this.config.swipe_wrap !== undefined
      ? this.config.swipe_wrap
      : this.defaultConfig.swipe_wrap;
  }

  get _swipe_prevent_default() {
    return this.config.swipe_prevent_default !== undefined
      ? this.config.swipe_prevent_default
      : this.defaultConfig.swipe_prevent_default;
  }

  render() {
    this.exception = this.exception !== undefined && this.exception !== false;
    return html`
      <custom-style>
        <style is="custom-style">
          a {
            color: var(--text-dark-color);
            text-decoration: none;
          }
          .card-header {
            margin-top: -5px;
            @apply --paper-font-headline;
          }
          .card-header paper-icon-button {
            margin-top: -5px;
            float: right;
          }
        </style>
      </custom-style>
      ${!this.exception
        ? html`
            <h1 style="margin-top:-20px;margin-bottom:0;" class="underline">
              Compact Custom Header
            </h1>
            <h4
              style="margin-top:-5px;padding-top:10px;font-size:12pt;"
              class="underline"
            >
              <a
                href="https://maykar.github.io/compact-custom-header/"
                target="_blank"
              >
                <ha-icon icon="mdi:help-circle" style="margin-top:-5px;">
                </ha-icon>
                Docs&nbsp;&nbsp;&nbsp;</a
              >
              <a
                href="https://github.com/maykar/compact-custom-header"
                target="_blank"
              >
                <ha-icon icon="mdi:github-circle" style="margin-top:-5px;">
                </ha-icon>
                Github&nbsp;&nbsp;&nbsp;</a
              >
              <a
                href="https://community.home-assistant.io/t/compact-custom-header"
                target="_blank"
              >
                <ha-icon icon="hass:home-assistant" style="margin-top:-5px;">
                </ha-icon>
                Forums</a
              >
            </h4>
          `
        : ""}
      ${this.renderStyle()}
      <div class="side-by-side">
        <paper-toggle-button
          class="${this.exception && this.config.disable === undefined
            ? "inherited"
            : ""}"
          ?checked="${this._disable !== false}"
          .configValue="${"disable"}"
          @change="${this._valueChanged}"
          title="Completely disable CCH. Useful for exceptions."
        >
          Disable CCH
        </paper-toggle-button>
        <paper-toggle-button
          class="${this.exception && this.config.header === undefined
            ? "inherited"
            : ""}"
          ?checked="${this._header !== false && this._kiosk_mode == false}"
          .configValue="${"header"}"
          @change="${this._valueChanged}"
          title="Turn off to hide the header completely."
        >
          Display Header
        </paper-toggle-button>
        <paper-toggle-button
          class="${this.exception && this.config.chevrons === undefined
            ? "inherited"
            : ""}"
          ?checked="${this._chevrons !== false}"
          .configValue="${"chevrons"}"
          @change="${this._valueChanged}"
          title="Tab/view scrolling controls in header."
        >
          Display Tab Chevrons
        </paper-toggle-button>
        <paper-toggle-button
          class="${this.exception && this.config.redirect === undefined
            ? "inherited"
            : ""}"
          ?checked="${this._redirect !== false}"
          .configValue="${"redirect"}"
          @change="${this._valueChanged}"
          title="Auto-redirect away from hidden tabs."
        >
          Hidden Tab Redirect
        </paper-toggle-button>
        <paper-toggle-button
          class="${this.exception && this.config.kiosk_mode === undefined
            ? "inherited"
            : ""}"
          ?checked="${this._kiosk_mode !== false}"
          .configValue="${"kiosk_mode"}"
          @change="${this._valueChanged}"
          title="Hide the header, close the sidebar, and disable sidebar swipe."
        >
          Kiosk Mode
        </paper-toggle-button>
        <paper-toggle-button
          class="${this.exception && this.config.hide_help === undefined
            ? "inherited"
            : ""}"
          ?checked="${this._hide_help !== false}"
          .configValue="${"hide_help"}"
          @change="${this._valueChanged}"
          title='Hide "Help" in options menu.'
        >
          Hide Help
        </paper-toggle-button>
        <paper-toggle-button
          class="${this.exception && this.config.sidebar_closed === undefined
            ? "inherited"
            : ""}"
          ?checked="${this._sidebar_closed !== false ||
            this._kiosk_mode !== false}"
          .configValue="${"sidebar_closed"}"
          @change="${this._valueChanged}"
          title="Closes the sidebar on opening Lovelace."
        >
          Close Sidebar
        </paper-toggle-button>
        <paper-toggle-button
          class="${this.exception && this.config.sidebar_swipe === undefined
            ? "inherited"
            : ""}"
          ?checked="${this._sidebar_swipe !== false &&
            this._kiosk_mode == false}"
          .configValue="${"sidebar_swipe"}"
          @change="${this._valueChanged}"
          title="Swipe to open sidebar on mobile devices."
        >
          Swipe Open Sidebar
        </paper-toggle-button>
      </div>

      <h4 class="underline">Buttons</h4>
      <div class="buttons side-by-side">
        <div
          class="${this.exception && this.config.menu === undefined
            ? "inherited"
            : ""}"
        >
          <iron-icon icon="hass:menu"></iron-icon>
          <paper-dropdown-menu
            @value-changed="${this._valueChanged}"
            label="Menu Button:"
            .configValue="${"menu"}"
          >
            <paper-listbox
              slot="dropdown-content"
              .selected="${buttonOptions.indexOf(this._menu)}"
            >
              ${buttonOptions.map(option => {
                return html`
                  <paper-item>${option}</paper-item>
                `;
              })}
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        <div
          class="${this.exception && this.config.notifications === undefined
            ? "inherited"
            : ""}"
        >
          <iron-icon icon="hass:bell"></iron-icon>
          <paper-dropdown-menu
            @value-changed="${this._valueChanged}"
            label="Notifications Button:"
            .configValue="${"notifications"}"
          >
            <paper-listbox
              slot="dropdown-content"
              .selected="${buttonOptions.indexOf(this._notifications)}"
            >
              ${buttonOptions.map(option => {
                return html`
                  <paper-item>${option}</paper-item>
                `;
              })}
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        <div
          class="${this.exception && this.config.voice === undefined
            ? "inherited"
            : ""}"
        >
          <iron-icon icon="hass:microphone"></iron-icon>
          <paper-dropdown-menu
            @value-changed="${this._valueChanged}"
            label="Voice Button:"
            .configValue="${"voice"}"
          >
            <paper-listbox
              slot="dropdown-content"
              .selected="${buttonOptions.indexOf(this._voice)}"
            >
              ${buttonOptions.map(option => {
                return html`
                  <paper-item>${option}</paper-item>
                `;
              })}
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        <div
          class="${this.exception && this.config.options === undefined
            ? "inherited"
            : ""}"
        >
          <iron-icon icon="hass:dots-vertical"></iron-icon>
          <paper-dropdown-menu
            @value-changed="${this._valueChanged}"
            label="Options Button:"
            .configValue="${"options"}"
          >
            <paper-listbox
              slot="dropdown-content"
              .selected="${overflowOptions.indexOf(this._options)}"
            >
              ${overflowOptions.map(option => {
                return html`
                  <paper-item>${option}</paper-item>
                `;
              })}
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
      </div>
      ${this._clock
        ? html`
            <h4 class="underline">Clock Options</h4>
            <div class="side-by-side">
              <paper-dropdown-menu
                class="${this.exception &&
                this.config.clock_format === undefined
                  ? "inherited"
                  : ""}"
                label="Clock format"
                @value-changed="${this._valueChanged}"
                .configValue="${"clock_format"}"
              >
                <paper-listbox
                  slot="dropdown-content"
                  .selected="${this._clock_format === "24" ? 1 : 0}"
                >
                  <paper-item>12</paper-item>
                  <paper-item>24</paper-item>
                </paper-listbox>
              </paper-dropdown-menu>
              <paper-input
                class="${this.exception && this.config.date_locale === undefined
                  ? "inherited"
                  : ""}"
                label="Date Locale:"
                .value="${this._date_locale}"
                .configValue="${"date_locale"}"
                @value-changed="${this._valueChanged}"
              >
              </paper-input>

              <div class="side-by-side">
                <paper-toggle-button
                  class="${this.exception &&
                  this.config.clock_am_pm === undefined
                    ? "inherited"
                    : ""}"
                  ?checked="${this._clock_am_pm !== false}"
                  .configValue="${"clock_am_pm"}"
                  @change="${this._valueChanged}"
                >
                  AM / PM</paper-toggle-button
                >
                <paper-toggle-button
                  class="${this.exception &&
                  this.config.clock_date === undefined
                    ? "inherited"
                    : ""}"
                  ?checked="${this._clock_date !== false}"
                  .configValue="${"clock_date"}"
                  @change="${this._valueChanged}"
                >
                  Date</paper-toggle-button
                >
              </div>
            </div>
          `
        : ""}
      <h4 class="underline">Tabs</h4>
      <paper-dropdown-menu id="tabs" @value-changed="${this._tabVisibility}">
        <paper-listbox
          slot="dropdown-content"
          .selected="${this._show_tabs.length > 0 ? "1" : "0"}"
        >
          <paper-item>Hide Tabs</paper-item>
          <paper-item>Show Tabs</paper-item>
        </paper-listbox>
      </paper-dropdown-menu>
      <div class="side-by-side">
        <div
          id="show"
          style="display:${this._show_tabs.length > 0 ? "initial" : "none"}"
        >
          <paper-input
            class="${this.exception && this.config.show_tabs === undefined
              ? "inherited"
              : ""}"
            label="Comma-separated list of tab numbers to show:"
            .value="${this._show_tabs}"
            .configValue="${"show_tabs"}"
            @value-changed="${this._valueChanged}"
          >
          </paper-input>
        </div>
        <div
          id="hide"
          style="display:${this._show_tabs.length > 0 ? "none" : "initial"}"
        >
          <paper-input
            class="${this.exception && this.config.hide_tabs === undefined
              ? "inherited"
              : ""}"
            label="Comma-separated list of tab numbers to hide:"
            .value="${this._hide_tabs}"
            .configValue="${"hide_tabs"}"
            @value-changed="${this._valueChanged}"
          >
          </paper-input>
        </div>
        <paper-input
          class="${this.exception && this.config.default_tab === undefined
            ? "inherited"
            : ""}"
          label="Default tab:"
          .value="${this._default_tab}"
          .configValue="${"default_tab"}"
          @value-changed="${this._valueChanged}"
        >
        </paper-input>
      </div>
      <h4 class="underline">Swipe Navigation</h4>
      <div class="side-by-side">
        <paper-toggle-button
          class="${this.exception && this.config.swipe === undefined
            ? "inherited"
            : ""}"
          ?checked="${this._swipe !== false}"
          .configValue="${"swipe"}"
          @change="${this._valueChanged}"
          title="Toggle Swipe Navigation"
        >
          Swipe Navigation
        </paper-toggle-button>
        ${this.config.swipe
          ? html`
        <paper-toggle-button
          class="${
            this.exception && this.config.swipe_wrap === undefined
              ? "inherited"
              : ""
          }"
          ?checked="${this._swipe_wrap !== false}"
          .configValue="${"swipe_wrap"}"
          @change="${this._valueChanged}"
          title="Wrap from first to last tab and vice versa."
        >
          Wrapping
        </paper-toggle-button>
        <paper-toggle-button
          class="${
            this.exception && this.config.swipe_prevent_default === undefined
              ? "inherited"
              : ""
          }"
          ?checked="${this._swipe_prevent_default !== false}"
          .configValue="${"swipe_prevent_default"}"
          @change="${this._valueChanged}"
          title="Prevent browsers default horizontal swipe action."
        >
          Prevent Default
        </paper-toggle-button>
        <div
        class="${
          this.exception && this.config.swipe_animate === undefined
            ? "inherited"
            : ""
        }"
      >
      </div>
      <div class="side-by-side">
        <paper-dropdown-menu
          @value-changed="${this._valueChanged}"
          label="Swipe Animation:"
          .configValue="${"swipe_animate"}"
        >
          <paper-listbox
            slot="dropdown-content"
            .selected="${swipeAnimation.indexOf(this._swipe_animate)}"
          >
            ${swipeAnimation.map(option => {
              return html`
                <paper-item>${option}</paper-item>
              `;
            })}
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
      <paper-input
      class="${
        this.exception && this.config.swipe_amount === undefined
          ? "inherited"
          : ""
      }"
      label="Percentage of screen width needed for swipe:"
      .value="${this._swipe_amount}"
      .configValue="${"swipe_amount"}"
      @value-changed="${this._valueChanged}"
    >
    </paper-input>
        </div>
        <paper-input
        class="${
          this.exception && this.config.swipe_skip === undefined
            ? "inherited"
            : ""
        }"
        label="Comma-separated list of tabs to skip over on swipe:"
        .value="${this._swipe_skip}"
        .configValue="${"swipe_skip"}"
        @value-changed="${this._valueChanged}"
      >
      </paper-input>
      </div>
    `
          : ""}
      </div>
    `;
  }

  _toggleCard() {
    this._closed = !this._closed;
    fireEvent(this, "iron-resize");
  }

  _tabVisibility() {
    let show = this.shadowRoot.querySelector('[id="show"]');
    let hide = this.shadowRoot.querySelector('[id="hide"]');
    if (this.shadowRoot.querySelector('[id="tabs"]').value == "Hide Tabs") {
      show.style.display = "none";
      hide.style.display = "initial";
    } else {
      hide.style.display = "none";
      show.style.display = "initial";
    }
  }

  _valueChanged(ev) {
    if (!this.config) {
      return;
    }
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
        delete this.config[target.configValue];
      } else {
        this.config = {
          ...this.config,
          [target.configValue]:
            target.checked !== undefined ? target.checked : target.value
        };
      }
    }
    fireEvent(this, "cch-config-changed", {
      config: this.config
    });
  }

  renderStyle() {
    return html`
      <style>
        h3,
        h4 {
          font-size: 16pt;
          margin-bottom: 5px;
          width: 100%;
        }
        paper-toggle-button {
          padding-top: 16px;
        }
        iron-icon {
          padding-right: 5px;
        }
        iron-input {
          max-width: 115px;
        }
        .inherited {
          opacity: 0.4;
        }
        .inherited:hover {
          opacity: 1;
        }
        .side-by-side {
          display: flex;
          flex-wrap: wrap;
        }
        .side-by-side > * {
          flex: 1;
          padding-right: 4px;
          flex-basis: 33%;
        }
        .buttons > div {
          display: flex;
          align-items: center;
        }
        .buttons > div paper-dropdown-menu {
          flex-grow: 1;
        }
        .buttons > div iron-icon {
          padding-right: 15px;
          padding-top: 20px;
          margin-left: -3px;
        }
        .buttons > div:nth-of-type(2n) iron-icon {
          padding-left: 20px;
        }
        .warning {
          background-color: #455a64;
          padding: 10px;
          color: #ffcd4c;
          border-radius: 5px;
        }
        .alert {
          margin-top: 5px;
          background-color: #eb5f59;
          padding: 10px;
          color: #fff;
          border-radius: 5px;
        }
        [closed] {
          overflow: hidden;
          height: 52px;
        }
        paper-card {
          margin-top: 10px;
          width: 100%;
          transition: all 0.5s ease;
        }
        .underline {
          width: 100%;
          background: var(--dark-color);
          color: var(--text-dark-color);
          padding: 5px;
          width: calc(100% + 30px);
          margin-left: calc(0% - 20px);
        }
      </style>
    `;
  }
}

customElements.define("cch-config-editor", CchConfigEditor);

export class CchExceptionEditor extends LitElement {
  static get properties() {
    return {
      config: {},
      exception: {},
      _closed: {}
    };
  }

  constructor() {
    super();
    this._closed = true;
  }

  render() {
    if (!this.exception) {
      return html``;
    }
    return html`
      ${this.renderStyle()}
      <custom-style>
        <style is="custom-style">
          .card-header {
            margin-top: -5px;
            @apply --paper-font-headline;
          }
          .card-header paper-icon-button {
            margin-top: -5px;
            float: right;
          }
        </style>
      </custom-style>
      <paper-card ?closed=${this._closed}>
        <div class="card-content">
          <div class="card-header">
            ${Object.values(this.exception.conditions).join(", ") ||
              "New Exception"}
            <paper-icon-button
              icon="${this._closed ? "mdi:chevron-down" : "mdi:chevron-up"}"
              @click="${this._toggleCard}"
            >
            </paper-icon-button>
            <paper-icon-button
              ?hidden=${this._closed}
              icon="mdi:delete"
              @click="${this._deleteException}"
            >
            </paper-icon-button>
          </div>
          <h4 class="underline">Conditions</h4>
          <cch-conditions-editor
            .conditions="${this.exception.conditions}"
            @cch-conditions-changed="${this._conditionsChanged}"
          >
          </cch-conditions-editor>
          <h4 class="underline">Config</h4>
          <cch-config-editor
            exception
            .defaultConfig="${{ ...defaultConfig, ...this.config }}"
            .config="${this.exception.config}"
            @cch-config-changed="${this._configChanged}"
          >
          </cch-config-editor>
        </div>
      </paper-card>
    `;
  }

  renderStyle() {
    return html`
      <style>
        h3,
        h4 {
          font-size: 16pt;
          margin-bottom: 5px;
          width: 100%;
        }
        [closed] {
          overflow: hidden;
          height: 52px;
        }
        paper-card {
          margin-top: 10px;
          width: 100%;
          transition: all 0.5s ease;
        }
        .underline {
          width: 100%;
          background: var(--dark-color);
          color: var(--text-dark-color);
          padding: 5px;
          width: calc(100% + 30px);
          margin-left: calc(0% - 20px);
        }
      </style>
    `;
  }

  _toggleCard() {
    this._closed = !this._closed;
    fireEvent(this, "iron-resize");
  }

  _deleteException() {
    fireEvent(this, "cch-exception-delete");
  }

  _conditionsChanged(ev) {
    if (!this.exception) {
      return;
    }
    const newException = {
      ...this.exception,
      conditions: ev.detail.conditions
    };
    fireEvent(this, "cch-exception-changed", {
      exception: newException
    });
  }

  _configChanged(ev) {
    ev.stopPropagation();
    if (!this.exception) {
      return;
    }
    const newException = { ...this.exception, config: ev.detail.config };
    fireEvent(this, "cch-exception-changed", {
      exception: newException
    });
  }
}

customElements.define("cch-exception-editor", CchExceptionEditor);

export class CchConditionsEditor extends LitElement {
  static get properties() {
    return {
      conditions: {}
    };
  }

  get _user() {
    return this.conditions.user || "";
  }

  get _user_agent() {
    return this.conditions.user_agent || "";
  }

  get _media_query() {
    return this.conditions.media_query || "";
  }

  render() {
    if (!this.conditions) {
      return html``;
    }
    return html`
      <paper-input
        label="User"
        .value="${this._user}"
        .configValue="${"user"}"
        @value-changed="${this._valueChanged}"
      >
      </paper-input>
      <paper-input
        label="User agent"
        .value="${this._user_agent}"
        .configValue="${"user_agent"}"
        @value-changed="${this._valueChanged}"
      >
      </paper-input>
      <paper-input
        label="Media query"
        .value="${this._media_query}"
        .configValue="${"media_query"}"
        @value-changed="${this._valueChanged}"
      >
      </paper-input>
    `;
  }

  _valueChanged(ev) {
    if (!this.conditions) {
      return;
    }
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
        delete this.conditions[target.configValue];
      } else {
        this.conditions = {
          ...this.conditions,
          [target.configValue]: target.value
        };
      }
    }
    fireEvent(this, "cch-conditions-changed", {
      conditions: this.conditions
    });
  }
}

customElements.define("cch-conditions-editor", CchConditionsEditor);
