import Component from '../core/Component.js';
export default class Header extends Component { render() { return `<div class="topbar"><strong>${this.props.title}</strong></div>`; } }
