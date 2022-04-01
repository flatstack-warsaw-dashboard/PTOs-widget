import * as ReactDOM from 'react-dom';
import React from 'react';
import { StyleSheetManager } from 'styled-components';
import PTOsWidgetComponent from './PTOsWidget';

class PTOsWidget extends HTMLElement {
  private shadow = this.attachShadow({ mode: 'open' });

  connectedCallback() {
    this.render();
  }

  render() {
    ReactDOM.render(
      <StyleSheetManager target={this.shadow as unknown as HTMLElement}>
        <PTOsWidgetComponent />
      </StyleSheetManager>,
      this.shadow,
    );
  }
}

window.customElements.define('fwd-ptos-widget', PTOsWidget);
