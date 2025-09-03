import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
}

interface LocationSuggestion {
  id: string;
  name: string;
  display_name: string;
  type: string;
  category: string;
  district?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Search Kerala districts, municipalities & towns...",
  label = "Location (Optional)",
  id = "location"
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchCounterRef = useRef(0);

  // Kerala bounding box coordinates
  const KERALA_BOUNDS = {
    south: 8.17,    // Southernmost point of Kerala
    north: 12.79,   // Northernmost point of Kerala  
    west: 74.85,    // Westernmost point of Kerala
    east: 77.42     // Easternmost point of Kerala
  };

  // Focused search for Kerala districts, municipalities and towns
  const searchLocations = async (query: string) => {
    // Clear previous results immediately when query is too short
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this search
    const currentController = new AbortController();
    abortControllerRef.current = currentController;

    // Increment search counter to track this specific search
    const currentSearchId = ++searchCounterRef.current;

    setIsLoading(true);
    
    // Clear previous suggestions immediately to avoid showing stale data
    setSuggestions([]);

    try {
      // Focused search queries for districts, municipalities and towns
      const searches = [
        // Primary search for districts and major cities in Kerala
        {
          url: `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, Kerala, India&limit=8&addressdetails=1&accept-language=en&countrycodes=in&viewbox=${KERALA_BOUNDS.west},${KERALA_BOUNDS.north},${KERALA_BOUNDS.east},${KERALA_BOUNDS.south}&bounded=1&featuretype=district,city,town,municipality`,
          priority: 1
        },
        // Secondary search for administrative areas
        {
          url: `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&state=Kerala&country=India&limit=6&addressdetails=1&accept-language=en&countrycodes=in&class=boundary,place&type=administrative,city,town,municipality`,
          priority: 2
        }
      ];

      const allResults: any[] = [];

      // Execute searches in parallel with abort signal
      const searchPromises = searches.map(async (search) => {
        try {
          const response = await fetch(search.url, {
            headers: {
              'User-Agent': 'PetaLog-Kerala-LocationSearch/1.0'
            },
            signal: currentController.signal
          });

          if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
          }

          const data = await response.json();
          return data.map((item: any) => ({ ...item, searchPriority: search.priority }));
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            // Request was cancelled, don't log as error
            return [];
          }
          return [];
        }
      });

      const searchResults = await Promise.all(searchPromises);
      
      // Check if this search is still the most recent one
      if (currentSearchId !== searchCounterRef.current) {
        // This search has been superseded by a newer one, ignore results
        return;
      }

      // Check if request was aborted
      if (currentController.signal.aborted) {
        return;
      }
      
      // Flatten and combine results
      searchResults.forEach(results => {
        allResults.push(...results);
      });

      // Filter and format results for districts, municipalities and towns only
      const keralaResults = allResults
        .filter((item: any) => {
          // Ensure the result is within Kerala bounds
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          
          const withinBounds = lat >= KERALA_BOUNDS.south && 
                              lat <= KERALA_BOUNDS.north && 
                              lon >= KERALA_BOUNDS.west && 
                              lon <= KERALA_BOUNDS.east;

          // Check if address contains Kerala
          const addressContainsKerala = item.address?.state === 'Kerala' || 
                                       item.display_name?.toLowerCase().includes('kerala');

          // Filter for districts, municipalities, and towns only
          const isRelevantType = item.type === 'administrative' || 
                                item.type === 'city' || 
                                item.type === 'town' || 
                                item.type === 'municipality' ||
                                item.class === 'boundary' ||
                                (item.class === 'place' && ['city', 'town', 'municipality'].includes(item.type));

          return (withinBounds || addressContainsKerala) && isRelevantType;
        })
        .map((item: any) => {
          // Extract location information
          const address = item.address || {};
          const district = address.county || address.state_district || address.district || '';
          const cityName = address.city || address.town || address.municipality || item.name || '';
          
          // Create display name
          let displayParts = [];
          
          if (cityName) {
            displayParts.push(cityName);
          }
          
          if (district && cityName !== district) {
            displayParts.push(district);
          }
          
          displayParts.push('Kerala');

          // Determine location category
          let category = 'location';
          if (item.type === 'administrative' || item.class === 'boundary') {
            if (address.county || address.state_district) {
              category = 'district';
            } else {
              category = 'administrative';
            }
          } else if (item.type === 'city' || address.city) {
            category = 'city';
          } else if (item.type === 'town' || address.town) {
            category = 'town';
          } else if (item.type === 'municipality' || address.municipality) {
            category = 'municipality';
          }

          return {
            id: `${item.place_id || item.osm_id}`,
            name: cityName || item.name || item.display_name.split(',')[0],
            display_name: displayParts.join(', '),
            type: item.type || 'location',
            category: category,
            district: district,
            searchPriority: item.searchPriority,
            importance: item.importance || 0
          };
        })
        // Remove duplicates based on name and district
        .filter((item: any, index: number, self: any[]) => {
          return index === self.findIndex(other => 
            other.name.toLowerCase() === item.name.toLowerCase() && 
            other.district === item.district
          );
        })
        // Sort by relevance and importance
        .sort((a: any, b: any) => {
          // Prioritize districts first
          if (a.category === 'district' && b.category !== 'district') return -1;
          if (b.category === 'district' && a.category !== 'district') return 1;
          
          // Then by search priority (lower is better)
          if (a.searchPriority !== b.searchPriority) {
            return a.searchPriority - b.searchPriority;
          }
          
          // Then by importance (higher is better)
          if (a.importance !== b.importance) {
            return b.importance - a.importance;
          }
          
          // Finally by name length (shorter is often more relevant)
          return a.name.length - b.name.length;
        })
        // Limit final results
        .slice(0, 8);

      const formattedSuggestions: LocationSuggestion[] = keralaResults;

      // Final check to ensure this is still the current search
      if (currentSearchId === searchCounterRef.current && !currentController.signal.aborted) {
        setSuggestions(formattedSuggestions);
        setShowSuggestions(formattedSuggestions.length > 0);
        setActiveSuggestion(-1);
      }
    } catch (error) {
      // Only log errors if the request wasn't aborted
      if (currentController.signal.aborted) {
        return;
      }
      
      // Only update state if this is still the current search
      if (currentSearchId === searchCounterRef.current) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } finally {
      // Only update loading state if this is still the current search
      if (currentSearchId === searchCounterRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear suggestions immediately if input is empty or too short
    if (newValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    // Set new timeout for debounced search
    timeoutRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 200); // Reduced debounce time for better responsiveness
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    onChange(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    setActiveSuggestion(-1);
    setIsLoading(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestion >= 0 && activeSuggestion < suggestions.length) {
          handleSuggestionClick(suggestions[activeSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        setIsLoading(false);
        break;
    }
  };

  // Handle focus and blur events
  const handleFocus = () => {
    if (suggestions.length > 0 && value.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }, 200);
  };

  // Scroll active suggestion into view
  useEffect(() => {
    if (activeSuggestion >= 0 && suggestionRefs.current[activeSuggestion]) {
      suggestionRefs.current[activeSuggestion]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeSuggestion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'district':
        return '🏛️';
      case 'city':
        return '🏙️';
      case 'town':
        return '🏘️';
      case 'municipality':
        return '🏢';
      default:
        return '📍';
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'district':
        return 'text-purple-600';
      case 'city':
        return 'text-blue-600';
      case 'town':
        return 'text-green-600';
      case 'municipality':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-2 relative">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete="off"
          className="pr-8"
        />
        <MapPin className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              ref={el => suggestionRefs.current[index] = el}
              className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                index === activeSuggestion ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg mt-0.5 flex-shrink-0">
                  {getCategoryIcon(suggestion.category)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {suggestion.name}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 ${getCategoryColor(suggestion.category)}`}>
                      {suggestion.category}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {suggestion.display_name}
                  </div>
                  {suggestion.district && suggestion.category !== 'district' && (
                    <div className="text-xs text-gray-500">
                      {suggestion.district} District
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && !isLoading && suggestions.length === 0 && value.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-3">
          <div className="text-sm text-gray-500 text-center">
            No Kerala districts, municipalities or towns found for "{value}"
          </div>
          <div className="text-xs text-gray-400 text-center mt-1">
            Try searching for major cities or district names
          </div>
        </div>
      )}

      {/* Powered by OpenStreetMap notice */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="text-xs text-gray-400 mt-1">
          Kerala locations powered by{' '}
          <a 
            href="https://www.openstreetmap.org/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            OpenStreetMap
          </a>
        </div>
      )}
    </div>
  );
}; 