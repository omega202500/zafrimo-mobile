export default class Component {
  constructor(props = {}) { this.props = props; }
  render() { return ''; }
  mount(container) { container.innerHTML = this.render(); this.bindEvents(container); }
  bindEvents(container) {}
}
