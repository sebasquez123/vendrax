import { Injectable } from '@nestjs/common';
import type { CacheEntry } from '../domain/interfaces/cached';

/**
 * @Usage This service is oriented to serve Redis' logging, Redis' getway, Redis' syncroning and event suscription
 * for multiple services around Metbot in a centralized way
 */
@Injectable()
export class CacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  //** Imita el uso de Redis en el proyecto, el acople proximamente es transparente */

  /** Lectura: el valor vigente; lo vencido se borra al leerlo, como en Redis. */
  public async getKey<CacheType>(key: string | null): Promise<CacheType | null> {
    if (!key) return null;
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as CacheType;
  }

  /** Escritura: sin 'ttlMs' no vence (como SET); con 'ttlMs', vence a esos milisegundos (como SET … PX). */
  public async setKey<CacheType>(key: string, obj: CacheType, ttlMs?: number): Promise<CacheType> {
    this.entries.set(key, { value: obj, expiresAt: ttlMs ? Date.now() + ttlMs : null });
    return obj;
  }

  public async revokeKey(key: string): Promise<void> {
    this.entries.delete(key);
  }
}
