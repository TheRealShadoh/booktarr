/**
 * Universe View Component
 * Displays series grouped by shared universes (e.g., Cosmere, Stormlight Archive)
 * Visual grouping and organization of related series
 */
import React, { useMemo, useState } from 'react';
import { Series, Book } from '../types';

interface UniverseViewProps {
  seriesList?: Series[];
  booksBySeriesMap?: { [seriesName: string]: Book[] };
  onSeriesClick?: (seriesName: string) => void;
  title?: string;
  subtitle?: string;
}

interface UniverseGroup {
  name: string;
  seriesList: Series[];
  color: string;
  icon: string;
}

const UniverseView: React.FC<UniverseViewProps> = ({
  seriesList = [],
  booksBySeriesMap = {},
  onSeriesClick,
  title = 'Series by Universe',
  subtitle = 'Related series grouped by shared worlds and universes'
}) => {
  const [expandedUniverses, setExpandedUniverses] = useState<Set<string>>(new Set([''])); // Empty string for ungrouped

  // Group series by universe
  const universeGroups = useMemo<UniverseGroup[]>(() => {
    const groups: Record<string, Series[]> = {};

    // Group by universe or unknown
    seriesList.forEach(s => {
      const universe = s.universe || 'Ungrouped Series';
      if (!groups[universe]) {
        groups[universe] = [];
      }
      groups[universe].push(s);
    });

    // Sort series within each universe
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const posA = a.universe_order ?? 999;
        const posB = b.universe_order ?? 999;
        return posA - posB;
      });
    });

    // Define universe colors and icons
    const universeColors: Record<string, { color: string; icon: string }> = {
      'Cosmere': { color: 'from-purple-900 to-blue-900', icon: '🌌' },
      'Stormlight Archive': { color: 'from-blue-900 to-cyan-900', icon: '⚡' },
      'Middle Earth': { color: 'from-green-900 to-yellow-900', icon: '🌳' },
      'Star Wars': { color: 'from-gray-900 to-black', icon: '⭐' },
      'MCU': { color: 'from-red-900 to-yellow-900', icon: '🦸' },
      'Harry Potter': { color: 'from-purple-900 to-yellow-900', icon: '✨' },
      'Percy Jackson': { color: 'from-blue-900 to-green-900', icon: '⚔️' },
      'Ungrouped Series': { color: 'from-gray-700 to-gray-800', icon: '📚' }
    };

    return Object.entries(groups).map(([name, seriesList]) => {
      const colorData = universeColors[name] || {
        color: 'from-gray-700 to-gray-900',
        icon: '📚'
      };
      return {
        name,
        seriesList,
        color: colorData.color,
        icon: colorData.icon
      };
    });
  }, [seriesList]);

  const toggleUniverse = (universeName: string) => {
    setExpandedUniverses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(universeName)) {
        newSet.delete(universeName);
      } else {
        newSet.add(universeName);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-booktarr-text">{title}</h1>
        {subtitle && (
          <p className="text-booktarr-textSecondary text-sm mt-1">{subtitle}</p>
        )}
        <p className="text-booktarr-textMuted text-xs mt-2">
          {universeGroups.length} universe{universeGroups.length !== 1 ? 's' : ''} • {seriesList.length} series
        </p>
      </div>

      {/* Universes */}
      <div className="space-y-4">
        {universeGroups.map((universe) => {
          const isExpanded = expandedUniverses.has(universe.name);

          return (
            <div key={universe.name} className="overflow-hidden rounded-lg border border-booktarr-border">
              {/* Universe Header */}
              <button
                onClick={() => toggleUniverse(universe.name)}
                className={`w-full px-4 py-4 bg-gradient-to-r ${universe.color} hover:opacity-90 transition-opacity flex items-center justify-between group`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{universe.icon}</span>
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-white">{universe.name}</h2>
                    <p className="text-xs text-white/70">{universe.seriesList.length} series</p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-white transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {/* Series List */}
              {isExpanded && (
                <div className="bg-booktarr-surface p-4">
                  {universe.seriesList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {universe.seriesList.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => onSeriesClick?.(s.name)}
                          className="p-3 bg-booktarr-surface2 border border-booktarr-border rounded-lg hover:border-booktarr-accent hover:shadow-md transition-all text-left"
                        >
                          <h3 className="font-semibold text-booktarr-text text-sm truncate">{s.name}</h3>
                          <p className="text-xs text-booktarr-textMuted mt-1">
                            {s.total_books ? `${s.total_books} books` : 'Unknown count'}
                          </p>
                          {s.author && (
                            <p className="text-xs text-booktarr-textSecondary mt-1 line-clamp-1">{s.author}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-booktarr-textMuted text-sm">No series in this universe</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-booktarr-surface p-4 rounded-lg border border-booktarr-border">
          <p className="text-booktarr-textMuted text-xs mb-1">Total Universes</p>
          <p className="text-2xl font-bold text-booktarr-accent">{universeGroups.length}</p>
        </div>
        <div className="bg-booktarr-surface p-4 rounded-lg border border-booktarr-border">
          <p className="text-booktarr-textMuted text-xs mb-1">Total Series</p>
          <p className="text-2xl font-bold text-booktarr-accent">{seriesList.length}</p>
        </div>
        <div className="bg-booktarr-surface p-4 rounded-lg border border-booktarr-border">
          <p className="text-booktarr-textMuted text-xs mb-1">Ungrouped Series</p>
          <p className="text-2xl font-bold text-booktarr-accent">
            {universeGroups.find(u => u.name === 'Ungrouped Series')?.seriesList.length || 0}
          </p>
        </div>
        <div className="bg-booktarr-surface p-4 rounded-lg border border-booktarr-border">
          <p className="text-booktarr-textMuted text-xs mb-1">Organized Series</p>
          <p className="text-2xl font-bold text-booktarr-accent">
            {seriesList.length - (universeGroups.find(u => u.name === 'Ungrouped Series')?.seriesList.length || 0)}
          </p>
        </div>
      </div>

      {/* Tip */}
      <div className="p-4 bg-booktarr-surface2 rounded-lg border border-booktarr-border">
        <p className="text-xs text-booktarr-textSecondary">
          💡 <strong>Tip:</strong> Series are grouped by universe (e.g., Cosmere contains Stormlight Archive, Mistborn, Warbreaker, etc.).
          You can edit series to add them to universes in the series details page.
        </p>
      </div>
    </div>
  );
};

export default UniverseView;
