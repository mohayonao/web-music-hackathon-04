export default class SongSelector extends React.Component {
  constructor(...args) {
    super(...args);

    this.$onChange = this.$onChange.bind(this);
  }

  render() {
    let { data } = this.props;
    let options = data.songs.map((song) => {
      let songName = song.replace(/-/g, " ");

      songName = songName.charAt(0).toUpperCase() + songName.substr(1);

      return (
        <option value={ song }>{ songName }</option>
      );
    });

    return (
      <div className="form-inline">
        <select value={ data.song } onChange={ this.$onChange } className="form-control song-selector">
          { options }
        </select>
      </div>
    );
  }

  $onChange(e) {
    let { router } = this.props;
    let selectedIndex = e.target.options.selectedIndex;

    router.createAction("/sound/load/score", {
      name: e.target.options[selectedIndex].value,
    });
  }
}
