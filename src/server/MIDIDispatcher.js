export default class MIDIDispatcher {
  constructor() {
    this.index = 0;
    this.clients = [];
  }

  setClients(clients) {
    this.clients = clients.slice().sort(() => Math.random() - 0.5);
  }

  getClient() {
    if (this.clients.length <= this.index) {
      this.clients = this.clients.sort(() => Math.random() - 0.5);
      this.index = 0;
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
