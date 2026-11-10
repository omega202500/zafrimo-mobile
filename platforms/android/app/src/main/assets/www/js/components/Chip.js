import Component from '../core/Component.js';
export default class Chip extends Component { render() { return `<button class="chip ${this.props.on ? 'on' : ''}">${this.props.label}</button>`; } }
