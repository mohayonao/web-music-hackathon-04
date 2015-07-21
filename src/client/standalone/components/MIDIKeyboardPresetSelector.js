const DEFAULT = "Random";

export default class MIDIKeyboardPresetSelector extends React.Component {
  constructor(...args) {
    super(...args);

    this.$onChange = this.$onChange.bind(this);
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
      <select value={ data.presetName || DEFAULT } onChange={ this.$onChange } className="form-control midi-keyboard-preset-selector">
        { options }
      </select>
      </div>
    );
  }

  $onChange(e) {
    let { router } = this.props;
    let selectedIndex = e.target.options.selectedIndex;

    router.createAction("/midi-keyboard/preset", {
      presetName: e.target.options[selectedIndex].value,
    });
  }
}
