import { 
  OfflineQueueItem, 
  generateTransactionId, 
  getCairoCurrentTimeString 
} from '../types';

const OFFLINE_QUEUE_KEY = 'lamsa_offline_queue_v1';

export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading offline queue:', e);
  }
  return [];
}

export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error saving offline queue:', e);
  }
}

export function enqueueOfflineAction(
  entityType: OfflineQueueItem['entityType'],
  payload: any
): OfflineQueueItem {
  const transactionId = generateTransactionId('TX');
  const cairoTime = getCairoCurrentTimeString();

  const item: OfflineQueueItem = {
    id: transactionId,
    entityType,
    payload: {
      ...payload,
      transactionId,
      deviceTimestamp: cairoTime,
      isOfflineCreated: true,
    },
    deviceTimestamp: cairoTime,
    retryCount: 0,
    status: 'معلق',
  };

  const queue = getOfflineQueue();
  queue.push(item);
  saveOfflineQueue(queue);
  return item;
}

export function removeOfflineItem(id: string): void {
  const queue = getOfflineQueue().filter(i => i.id !== id);
  saveOfflineQueue(queue);
}

export function updateOfflineItemStatus(
  id: string, 
  status: OfflineQueueItem['status'], 
  errorMessage?: string
): void {
  const queue = getOfflineQueue().map(i => {
    if (i.id === id) {
      return {
        ...i,
        status,
        retryCount: i.retryCount + 1,
        errorMessage
      };
    }
    return i;
  });
  saveOfflineQueue(queue);
}
