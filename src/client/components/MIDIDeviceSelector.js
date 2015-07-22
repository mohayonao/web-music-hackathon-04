import ToggleButton from "./ToggleButton";

const DEFAULT = "Select MIDI Device";

export default class MIDIDeviceSelector extends React.Component {
  constructor(...args) {
    super(...args);

    this.$onChange = this.$onChange.bind(this);
    this.$onClick = this.$onClick.bind(this);
  }

  render() {
    let { router, data } = this.props;
    let options = [ DEFAULT ].concat(data.controllers).map((deviceName) => {
      return (
        <option value={ deviceName }>{ deviceName }</option>
      );
    });
    let buttonData = {
      value: data.deviceName && data.deviceName === data.connectedDeviceName,
      trueValue: "CONNECTED",
      falseValue: "CONNECT",
    };

    return (
      <div className="form-inline">
        <select value={ data.deviceName || DEFAULT } onChange={ this.$onChange } className="form-control midi-device-selector">
          { options }
        </select>
        <ToggleButton router={ router } data={ buttonData } action={ this.$onClick } />
      </div>
    );
  }

  $onChange(e) {
    let { router } = this.props;
    let selectedIndex = e.target.options.selectedIndex;

    router.createAction("/midi-device/select", {
      target: this.props.target,
      deviceName: e.target.options[selectedIndex].value,
    });
  }

  $onClick() {
    let { router, data } = this.props;

    if (!data.deviceName || data.deviceName === DEFAULT) {
      return;
    }

    router.createAction("/midi-device/connect", {
      target: this.props.target,
      deviceName: data.deviceName,
    });
  }
}
