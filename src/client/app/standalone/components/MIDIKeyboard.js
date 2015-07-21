import MIDIDeviceSelector from "./MIDIDeviceSelector";
import MIDIKeyboardPresetSelector from "./MIDIKeyboardPresetSelector";
import MIDIKeyboardController from "./MIDIKeyboardController";
import MIDIKeyboardContainer from "./MIDIKeyboardContainer";

export default class MIDIKeyboard extends React.Component {
  render() {
    let { router, data } = this.props;

    return (
      <div className="midi-keyboard">
        <MIDIDeviceSelector router={ router } data={ data } target="midi-keyboard" />
        <MIDIKeyboardPresetSelector router={ router } data={ data } />
        <div>
          <MIDIKeyboardController router={ router } data={ data } />
          <MIDIKeyboardContainer router={ router } data={ data } />
        </div>
      </div>
    );
  }
}
