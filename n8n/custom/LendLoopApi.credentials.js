class LendLoopApi {
  constructor() {
    this.name = 'lendLoopApi';
    this.displayName = 'LendLoop Automation API';
    this.documentationUrl = 'https://docs.n8n.io/credentials/';
    this.properties = [
      { displayName: 'Convex HTTP Base URL', name: 'baseUrl', type: 'string', default: '', placeholder: 'https://your-deployment.convex.site', required: true },
      { displayName: 'Convex → n8n Secret', name: 'inboundSecret', type: 'string', typeOptions: { password: true }, default: '', required: true },
      { displayName: 'n8n → Convex Secret', name: 'outboundSecret', type: 'string', typeOptions: { password: true }, default: '', required: true },
    ];
  }
}
module.exports = { LendLoopApi };
