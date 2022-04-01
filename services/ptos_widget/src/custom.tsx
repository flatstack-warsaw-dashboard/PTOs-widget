import * as ReactDOM from 'react-dom';
import PTOsWidgetComponent from './PTOsWidget';
import { StyleSheetManager } from 'styled-components';

class PTOsWidget extends HTMLElement {
  private shadow = this.attachShadow({ mode: 'open' });

  connectedCallback() {
    this.render();
  }

  render() {
    ReactDOM.render(
      <StyleSheetManager target={this.shadow as unknown as HTMLElement}>
        <>
          <PTOsWidgetComponent />
        </>
      </StyleSheetManager>,
      this.shadow,
    );
  }
}

window.customElements.define('fwd-ptos-widget', PTOsWidget);
