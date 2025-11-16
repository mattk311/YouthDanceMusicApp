import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  id: string;
  name: string;
  artist?: string;
  type: "track" | "artist";
}

interface AutocompleteInputProps {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: Suggestion) => void;
  disabled?: boolean;
  type: "track" | "artist";
  "data-testid"?: string;
}

export default function AutocompleteInput({
  id,
  placeholder,
  value,
  onChange,
  onSelect,
  disabled,
  type,
  "data-testid": testId,
}: AutocompleteInputProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!value || value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ 
          query: value, 
          type 
        });
        const response = await fetch(`/api/songs/autocomplete?${params}`);
        
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/";
            return;
          }
          toast({
            title: "Failed to load suggestions",
            description: "Please check your connection and try again",
            variant: "destructive",
          });
          setSuggestions([]);
          setIsOpen(false);
          return;
        }
        
        const data = await response.json();
        
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setIsOpen(true);
        } else {
          setSuggestions([]);
          setIsOpen(false);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        toast({
          title: "Network error",
          description: "Unable to fetch suggestions. Please try again.",
          variant: "destructive",
        });
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 3000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, type]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (suggestion: Suggestion) => {
    onChange(type === "track" ? suggestion.name : suggestion.name);
    onSelect?.(suggestion);
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        data-testid={testId}
        autoComplete="off"
      />
      
      {isOpen && suggestions.length > 0 && (
        <div 
          className="absolute z-50 w-full mt-1 bg-popover border border-popover-border rounded-md shadow-lg max-h-60 overflow-auto"
          data-testid={`${testId}-suggestions`}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={cn(
                "px-3 py-2 cursor-pointer hover-elevate active-elevate-2",
                selectedIndex === index && "bg-accent"
              )}
              onClick={() => handleSelect(suggestion)}
              data-testid={`suggestion-${index}`}
            >
              <div className="font-medium">{suggestion.name}</div>
              {suggestion.artist && (
                <div className="text-sm text-muted-foreground">{suggestion.artist}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
