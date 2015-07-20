const DEFAULT = "Random";

export default class MIDIKeyboardPresetSelector extends React.Component {
  constructor(...args) {
    super(...args);

    this._onChange = this._onChange.bind(this);
  }

  render() {
    let { data } = this.props;
    let options = [ DEFAULT ].concat(data.presets).map((presetName) => {
      return (
        <option value={ presetName }>{ presetName }</option>
      );
    });

    return (
      <div className="form-inline">
      <select value={ data.presetName || DEFAULT } onChange={ this._onChange } className="form-control midi-keyboard-preset-selector">
        { options }
      </select>
      </div>
    );
  }

  _onChange(e) {
    let { router } = this.props;
    let selectedIndex = e.target.options.selectedIndex;

    router.createAction("/midi-keyboard/preset", {
      presetName: e.target.options[selectedIndex].value,
    });
  }
}
