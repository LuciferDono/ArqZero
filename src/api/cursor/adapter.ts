// src/api/cursor/adapter.ts
import http2 from 'node:http2';
import type { LLMProvider } from '../provider.js';
import type { ChatRequest, StreamEvent } from '../types.js';
import { getCursorAuth } from './auth.js';
import { buildHeaders } from './headers.js';
import { ConnectRpcDecoder } from './stream-decoder.js';

const CURSOR_API_HOST = 'https://agentn.api5.cursor.sh';

export class CursorAdapter implements LLMProvider {
  readonly name = 'cursor';
  private session: http2.ClientHttp2Session | null = null;
  private aborted = false;
  private consecutiveErrors = 0;

  async *chat(params: ChatRequest): AsyncIterable<StreamEvent> {
    this.aborted = false;
    const forceRefresh = this.consecutiveErrors > 0;
    const auth = getCursorAuth(forceRefresh);

    try {
      const session = http2.connect(CURSOR_API_HOST);
      this.session = session;

      const headers = buildHeaders(auth.accessToken, auth.machineId);

      // TODO: Replace with actual protobuf serialization once
      // .proto schemas are captured from Cursor IDE binary
      const requestBody = Buffer.from(JSON.stringify({
        messages: params.messages,
        model: params.model,
      }));

      // Wrap in ConnectRPC envelope
      const envelope = Buffer.alloc(5 + requestBody.length);
      envelope[0] = 0x00;
      envelope.writeUInt32BE(requestBody.length, 1);
      requestBody.copy(envelope, 5);

      const req = session.request({
        ...headers,
        'content-length': String(envelope.length),
      });

      req.write(envelope);
      req.end();

      const decoder = new ConnectRpcDecoder();

      // Read streaming response
      for await (const chunk of req) {
        if (this.aborted) break;
        for (const frame of decoder.decode(chunk as Buffer)) {
          if (frame.isTrailer) continue;
          // TODO: Deserialize protobuf to StreamEvent
          const text = frame.payload.toString('utf-8');
          if (text) {
            yield { type: 'text_delta', text };
          }
        }
      }

      this.consecutiveErrors = 0;
      session.close();
    } catch (error) {
      this.consecutiveErrors++;
      yield {
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  abort(): void {
    this.aborted = true;
    this.session?.close();
  }

  async isAvailable(): Promise<boolean> {
    try {
      getCursorAuth();
      return true;
    } catch {
      return false;
    }
  }
}
