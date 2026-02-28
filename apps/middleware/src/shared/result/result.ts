export type Result<T, E> = Success<T> | Failure<E>;

export interface Success<T> {
  ok: true;
  value: T;
}

export interface Failure<E> {
  ok: false;
  error: E;
}

export function ok<T>(value: T): Success<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Failure<E> {
  return { ok: false, error };
}
