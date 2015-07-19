export default class MIDIDispatcher {
  constructor(router) {
    this.router = router;
    this.index = 0;
    this.clients = [];
  }

  getClient() {
    if (this.clients.length <= this.index) {
      this.clients = this.router.shared.enabledClients.slice().sort(() => Math.random() - 0.5);
      this.index = 0;
    }
    if (this.clients.length === 0) {
      return null;
    }

    return this.clients[this.index++];
  }

  push(data) {
    let client = this.getClient();

    if (client) {
      client.$pendings.push(data);
    }
  }
}
