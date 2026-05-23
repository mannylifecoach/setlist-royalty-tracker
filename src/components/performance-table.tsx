'use client';

import { Fragment, useMemo, useState } from 'react';
import { StatusBadge } from './status-badge';
import {
  groupByShow,
  formatStatusSummary,
  type PerformanceRow,
  type ShowGroup,
} from '@/lib/performance-grouping';
import { SOURCE_BADGE_LABELS } from '@/lib/source-display';

interface PerformanceTableProps {
  data: PerformanceRow[];
  onConfirm?: (ids: string[]) => void;
  onRowClick?: (id: string) => void;
  // When true, renders "· via {source}" next to the venue name on every
  // group header. Driven by the page-level hasMultipleSources check so the
  // badge only appears for users with rows from 2+ distinct sources.
  showSourceBadge?: boolean;
}

function SourceBadge({ sources }: { sources: ShowGroup['sources'] }) {
  if (sources.length === 0) return null;
  const label =
    sources.length === 1 ? SOURCE_BADGE_LABELS[sources[0]] : 'mixed sources';
  return (
    <span className="ml-1 text-[10px] text-text-disabled">· via {label}</span>
  );
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const daysLeft = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return daysLeft > 0 && daysLeft <= 30;
}

function daysUntilExpiration(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function formatLocation(group: { venueCity: string | null; venueState: string | null; venueCountry: string | null }): string {
  return [group.venueCity, group.venueState, group.venueCountry].filter(Boolean).join(', ') || '—';
}

export function PerformanceTable({
  data,
  onConfirm,
  onRowClick,
  showSourceBadge = false,
}: PerformanceTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo(() => groupByShow(data), [data]);
  const allDiscoveredIds = useMemo(
    () => data.filter((d) => d.performance.status === 'discovered').map((d) => d.performance.id),
    [data]
  );

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function selectIds(ids: string[], shouldSelect: boolean) {
    const next = new Set(selected);
    for (const id of ids) {
      if (shouldSelect) next.add(id);
      else next.delete(id);
    }
    setSelected(next);
  }

  function toggleAllDiscovered() {
    const allSelected = allDiscoveredIds.length > 0 && allDiscoveredIds.every((id) => selected.has(id));
    selectIds(allDiscoveredIds, !allSelected);
  }

  function toggleExpand(key: string) {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  }

  const discoveredSelected = data.filter(
    (d) => selected.has(d.performance.id) && d.performance.status === 'discovered'
  );

  return (
    <div>
      {onConfirm && discoveredSelected.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-bg-card border border-border-subtle rounded-[2px]">
          <span className="text-[12px] text-text-secondary">
            {discoveredSelected.length} selected
          </span>
          <button
            onClick={() => {
              onConfirm(discoveredSelected.map((d) => d.performance.id));
              setSelected(new Set());
            }}
            className="btn text-[11px] px-3 py-1"
          >
            confirm selected
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted text-left">
              <th className="pb-2 pr-1 w-6"></th>
              <th className="pb-2 pr-3 w-8">
                <input
                  type="checkbox"
                  checked={
                    allDiscoveredIds.length > 0 &&
                    allDiscoveredIds.every((id) => selected.has(id))
                  }
                  onChange={toggleAllDiscovered}
                  disabled={allDiscoveredIds.length === 0}
                  className="accent-status-discovered"
                />
              </th>
              <th className="pb-2 pr-3">date</th>
              <th className="pb-2 pr-3">song</th>
              <th className="pb-2 pr-3">artist</th>
              <th className="pb-2 pr-3">venue</th>
              <th className="pb-2 pr-3">location</th>
              <th className="pb-2 pr-3">status</th>
              <th className="pb-2 pr-3">expires</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) =>
              group.songCount === 1
                ? renderSingleSongRow(group, {
                    selected,
                    toggleSelect,
                    onRowClick,
                    showSourceBadge,
                  })
                : renderShowGroup(group, {
                    expanded: expanded.has(group.key),
                    toggleExpand: () => toggleExpand(group.key),
                    selected,
                    toggleSelect,
                    selectIds,
                    onRowClick,
                    showSourceBadge,
                  })
            )}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 text-text-muted text-[13px]">
          no performances found
        </div>
      )}
    </div>
  );
}

function renderSingleSongRow(
  group: ShowGroup,
  ctx: {
    selected: Set<string>;
    toggleSelect: (id: string) => void;
    onRowClick?: (id: string) => void;
    showSourceBadge: boolean;
  }
) {
  const row = group.rows[0];
  const { performance, song, artist } = row;
  const days = daysUntilExpiration(performance.expiresAt);
  const expiring = isExpiringSoon(performance.expiresAt);
  const displayStatus =
    expiring && performance.status !== 'submitted' ? 'expiring' : performance.status;

  return (
    <tr
      key={group.key}
      onClick={() => ctx.onRowClick?.(performance.id)}
      className="border-b border-border-subtle hover:bg-bg-hover transition-colors duration-150 cursor-pointer"
    >
      <td className="py-2.5 pr-1"></td>
      <td className="py-2.5 pr-3">
        <input
          type="checkbox"
          checked={ctx.selected.has(performance.id)}
          onChange={(e) => {
            e.stopPropagation();
            ctx.toggleSelect(performance.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="accent-status-discovered"
        />
      </td>
      <td className="py-2.5 pr-3 text-text-secondary whitespace-nowrap">
        {performance.eventDate}
      </td>
      <td className="py-2.5 pr-3 text-text font-medium">{song.title}</td>
      <td className="py-2.5 pr-3 text-text-secondary">{artist.artistName}</td>
      <td className="py-2.5 pr-3 text-text-secondary">
        {performance.venueName || '—'}
        {ctx.showSourceBadge && <SourceBadge sources={group.sources} />}
      </td>
      <td className="py-2.5 pr-3 text-text-muted whitespace-nowrap">{formatLocation(group)}</td>
      <td className="py-2.5 pr-3">
        <StatusBadge status={displayStatus} />
      </td>
      <td className="py-2.5 pr-3 whitespace-nowrap">
        {days !== null && performance.expiresAt ? (
          <div className="flex flex-col">
            <span className={`text-text-secondary ${expiring ? 'text-status-expiring font-medium' : ''}`}>
              {performance.expiresAt}
            </span>
            <span className={`text-[10px] ${expiring ? 'text-status-expiring' : 'text-text-muted'}`}>
              {days > 0 ? `${days}d left` : 'expired'}
            </span>
          </div>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
    </tr>
  );
}

function renderShowGroup(
  group: ShowGroup,
  ctx: {
    expanded: boolean;
    toggleExpand: () => void;
    selected: Set<string>;
    toggleSelect: (id: string) => void;
    selectIds: (ids: string[], shouldSelect: boolean) => void;
    onRowClick?: (id: string) => void;
    showSourceBadge: boolean;
  }
) {
  const earliestDays = daysUntilExpiration(group.earliestExpiresAt);
  const earliestExpiring = isExpiringSoon(group.earliestExpiresAt);
  const allDiscoveredSelected =
    group.discoveredIds.length > 0 &&
    group.discoveredIds.every((id) => ctx.selected.has(id));
  const noDiscovered = group.discoveredIds.length === 0;

  return (
    <Fragment key={group.key}>
      <tr
        onClick={ctx.toggleExpand}
        className="border-b border-border-subtle hover:bg-bg-hover transition-colors duration-150 cursor-pointer"
      >
        <td className="py-2.5 pr-1 text-text-muted text-center">
          {ctx.expanded ? '▼' : '▶'}
        </td>
        <td className="py-2.5 pr-3">
          <input
            type="checkbox"
            checked={allDiscoveredSelected}
            disabled={noDiscovered}
            onChange={(e) => {
              e.stopPropagation();
              ctx.selectIds(group.discoveredIds, !allDiscoveredSelected);
            }}
            onClick={(e) => e.stopPropagation()}
            className="accent-status-discovered"
          />
        </td>
        <td className="py-2.5 pr-3 text-text-secondary whitespace-nowrap">
          {group.eventDate}
        </td>
        <td className="py-2.5 pr-3 text-text font-medium">{group.songCount} songs</td>
        <td className="py-2.5 pr-3 text-text-secondary">{group.artist.artistName}</td>
        <td className="py-2.5 pr-3 text-text-secondary">
          {group.venueName || '—'}
          {ctx.showSourceBadge && <SourceBadge sources={group.sources} />}
        </td>
        <td className="py-2.5 pr-3 text-text-muted whitespace-nowrap">{formatLocation(group)}</td>
        <td className="py-2.5 pr-3 text-text-muted text-[11px]">
          {formatStatusSummary(group.statusCounts)}
        </td>
        <td className="py-2.5 pr-3 whitespace-nowrap">
          {earliestDays !== null && group.earliestExpiresAt ? (
            <div className="flex flex-col">
              <span className={`text-text-secondary ${earliestExpiring ? 'text-status-expiring font-medium' : ''}`}>
                {group.earliestExpiresAt}
              </span>
              <span className={`text-[10px] ${earliestExpiring ? 'text-status-expiring' : 'text-text-muted'}`}>
                {earliestDays > 0 ? `earliest · ${earliestDays}d` : 'expired'}
              </span>
            </div>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </td>
      </tr>
      {ctx.expanded &&
        group.rows.map((row) => {
          const { performance, song } = row;
          const days = daysUntilExpiration(performance.expiresAt);
          const expiring = isExpiringSoon(performance.expiresAt);
          const displayStatus =
            expiring && performance.status !== 'submitted' ? 'expiring' : performance.status;
          return (
            <tr
              key={performance.id}
              onClick={() => ctx.onRowClick?.(performance.id)}
              className="border-b border-border-subtle bg-bg-card/40 hover:bg-bg-hover transition-colors duration-150 cursor-pointer"
            >
              <td className="py-2 pr-1"></td>
              <td className="py-2 pr-3 pl-2">
                <input
                  type="checkbox"
                  checked={ctx.selected.has(performance.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    ctx.toggleSelect(performance.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-status-discovered"
                />
              </td>
              <td className="py-2 pr-3"></td>
              <td className="py-2 pr-3 text-text pl-4">{song.title}</td>
              <td className="py-2 pr-3"></td>
              <td className="py-2 pr-3"></td>
              <td className="py-2 pr-3"></td>
              <td className="py-2 pr-3">
                <StatusBadge status={displayStatus} />
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">
                {days !== null && performance.expiresAt ? (
                  <div className="flex flex-col">
                    <span className={`text-text-secondary ${expiring ? 'text-status-expiring font-medium' : ''}`}>
                      {performance.expiresAt}
                    </span>
                    <span className={`text-[10px] ${expiring ? 'text-status-expiring' : 'text-text-muted'}`}>
                      {days > 0 ? `${days}d left` : 'expired'}
                    </span>
                  </div>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </td>
            </tr>
          );
        })}
    </Fragment>
  );
}
