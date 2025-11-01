import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { NanoBananaServer } from '../../dist/server.js';

class StubImageGenerator {
  constructor() {
    this.generateRequests = [];
    this.editRequests = [];
    this.storyRequests = [];
  }

  async generateTextToImage(request) {
    this.generateRequests.push(request);
    const count = request.outputCount ?? 1;
    const generatedFiles = Array.from({ length: count }, (_, index) =>
      `/tmp/stub-generate-${index + 1}.png`,
    );
    return {
      success: true,
      message: `Stub generated ${count} image(s)`,
      generatedFiles,
    };
  }

  async editImage(request) {
    this.editRequests.push(request);
    return {
      success: true,
      message: 'Stub edited image',
      generatedFiles: ['/tmp/stub-edit.png'],
    };
  }

  async generateStorySequence(request) {
    this.storyRequests.push({ request });
    const count = request.outputCount ?? 1;
    const generatedFiles = Array.from({ length: count }, (_, index) =>
      `/tmp/stub-story-${index + 1}.png`,
    );
    return {
      success: true,
      message: `Stub generated ${count} story frame(s)`,
      generatedFiles,
    };
  }
}

test('NanoBananaServer lists tools and routes tool calls', async (t) => {
  const stubGenerator = new StubImageGenerator();
  const server = new NanoBananaServer(stubGenerator);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await server.start(serverTransport);

  const client = new Client(
    { name: 'test-client', version: '0.0.1' },
    { capabilities: { tools: {} } },
  );

  await client.connect(clientTransport);

  t.after(async () => {
    await client.close();
    await server.stop();
  });

  const listResult = await client.listTools();
  assert.ok(
    listResult.tools.some((tool) => tool.name === 'generate_image'),
    'generate_image should be exposed',
  );
  assert.ok(
    listResult.tools.some((tool) => tool.name === 'hello'),
    'hello tool should be exposed',
  );

  const helloResult = await client.callTool({
    name: 'hello',
    arguments: { name: 'Tester' },
  });
  const helloMessage =
    helloResult.content?.find((item) => item.type === 'text')?.text ?? '';
  assert.equal(helloMessage, 'Hello, Tester!');

  const generateResult = await client.callTool({
    name: 'generate_image',
    arguments: { prompt: 'testing prompt', outputCount: 2 },
  });
  const generateMessage =
    generateResult.content?.find((item) => item.type === 'text')?.text ?? '';
  assert.ok(
    generateMessage.includes('Stub generated 2 image(s)'),
    'Response should include stub message',
  );
  assert.equal(stubGenerator.generateRequests.length, 1);
  assert.equal(stubGenerator.generateRequests[0].prompt, 'testing prompt');
  assert.equal(stubGenerator.generateRequests[0].outputCount, 2);

  const iconResult = await client.callTool({
    name: 'generate_icon',
    arguments: {
      prompt: 'banana logo',
      type: 'app-icon',
      corners: 'rounded',
      preview: false,
    },
  });
  const iconMessage =
    iconResult.content?.find((item) => item.type === 'text')?.text ?? '';
  assert.ok(iconMessage.includes('Stub generated 1 image(s)'));
  assert.equal(stubGenerator.generateRequests.length, 2);
  const iconPrompt = stubGenerator.generateRequests[1].prompt;
  assert.ok(iconPrompt.includes('banana logo'));
  assert.ok(
    iconPrompt.includes('rounded corners'),
    'Icon prompt should include corners detail',
  );
});
