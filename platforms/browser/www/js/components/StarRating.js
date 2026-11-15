import Component from '../core/Component.js';
export default class StarRating extends Component {
  render() { const n = this.props.value || 0; return `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}</span>`; }
}
