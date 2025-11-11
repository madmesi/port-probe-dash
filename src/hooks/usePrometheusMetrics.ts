import { useState, useEffect, useCallback } from 'react';

export interface ServerMetrics {
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  network_rx?: number;
  network_tx?: number;
  status: 'online' | 'offline' | 'warning';
}

export const usePrometheusMetrics = (prometheusUrl: string, isConnected: boolean) => {
  const [metrics, setMetrics] = useState<Record<string, ServerMetrics>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchMetrics = useCallback(async (instances: string[]) => {
    if (!prometheusUrl || !isConnected || instances.length === 0) {
      return;
    }

    setIsLoading(true);
    const newMetrics: Record<string, ServerMetrics> = {};

    try {
      await Promise.all(instances.map(async (instance) => {
        try {
          const escapedInstance = instance.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Fetch CPU usage
          const cpuQuery = `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle",instance="${escapedInstance}"}[5m])) * 100)`;
          const cpuRes = await fetch(`${prometheusUrl}/api/v1/query?query=${encodeURIComponent(cpuQuery)}`);
          const cpuData = await cpuRes.json();
          const cpuValue = cpuData?.data?.result?.[0]?.value?.[1];

          // Fetch Memory usage
          const memQuery = `100 * (1 - ((node_memory_MemAvailable_bytes{instance="${escapedInstance}"} or node_memory_MemFree_bytes{instance="${escapedInstance}"}) / node_memory_MemTotal_bytes{instance="${escapedInstance}"}))`;
          const memRes = await fetch(`${prometheusUrl}/api/v1/query?query=${encodeURIComponent(memQuery)}`);
          const memData = await memRes.json();
          const memValue = memData?.data?.result?.[0]?.value?.[1];

          // Fetch Disk usage
          const diskQuery = `100 - ((node_filesystem_avail_bytes{instance="${escapedInstance}",fstype!="tmpfs",fstype!="overlay"} / node_filesystem_size_bytes{instance="${escapedInstance}",fstype!="tmpfs",fstype!="overlay"}) * 100)`;
          const diskRes = await fetch(`${prometheusUrl}/api/v1/query?query=${encodeURIComponent(diskQuery)}`);
          const diskData = await diskRes.json();
          const diskValue = diskData?.data?.result?.[0]?.value?.[1];

          const cpu = cpuValue ? parseFloat(cpuValue) : undefined;
          const memory = memValue ? parseFloat(memValue) : undefined;
          const disk = diskValue ? parseFloat(diskValue) : undefined;

          // Determine status based on metrics
          let status: 'online' | 'offline' | 'warning' = 'online';
          if (!cpu && !memory && !disk) {
            status = 'offline';
          } else if ((cpu && cpu > 80) || (memory && memory > 85) || (disk && disk > 90)) {
            status = 'warning';
          }

          newMetrics[instance] = {
            cpu_usage: cpu ? Math.round(cpu * 10) / 10 : undefined,
            memory_usage: memory ? Math.round(memory * 10) / 10 : undefined,
            disk_usage: disk ? Math.round(disk * 10) / 10 : undefined,
            status,
          };
        } catch (err) {
          newMetrics[instance] = { status: 'offline' };
        }
      }));

      setMetrics(newMetrics);
    } catch (error) {
      console.error('Failed to fetch Prometheus metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [prometheusUrl, isConnected]);

  return { metrics, isLoading, fetchMetrics };
};
