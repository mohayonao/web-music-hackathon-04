import xtend from "xtend";
import MIDIKeyboardPad from "./MIDIKeyboardPad";

const BLACK_KEYS = [ 1, 3, 6, 8, 10 ];

export default class MIDIKeyboardContainer extends React.Component {
  render() {
    let { router, data } = this.props;
    let keyElements = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ].map((index) => {
      let styles = {
        paddingTop: BLACK_KEYS.indexOf(index) !== -1 ? 0 : "58px",
      };
      let keyData = xtend(data, { value: data.octave * 12 + index });

      return (
        <li className="midi-keyboard-key">
          <div style={ styles }>
            <MIDIKeyboardPad router={ router } data={ keyData } action="noteOn" />
          </div>
        </li>
      );
    });

    return (
      <ul className="midi-keyboard-container">{ keyElements }</ul>
    );
  }
}
