import MIDIDeviceSelector from "./MIDIDeviceSelector";
import LaunchControlTrackContainer from "./LaunchControlTrackContainer";

export default class LaunchControl extends React.Component {
  render() {
    let { router, data } = this.props;

    return (
      <div className="launch-control">
        <MIDIDeviceSelector router={ router } data={ data } target="launch-control" />
        <LaunchControlTrackContainer router={ router } data={ data } />
      </div>
    );
  }
}
