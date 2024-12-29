"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useRouter } from "next/navigation";

interface FilterValue {
  value: string;
  label: string;
  id: number;
}

interface FilterProps {
  filterItems: FilterValue[];
  queryName: string;
}

export function FilterButton({ filterItems, queryName }: FilterProps) {
  // State to manage the open/close state of the popover
  const [open, setOpen] = useState(false);
  // State to manage the selected filter value
  const [value, setValue] = useState("");
  const router = useRouter();

  // Function to handle filter change
  const handleFilterChange = (itemId: number) => {
    // Find the selected value based on itemId
    const selectedValue =
      filterItems.find((item) => item.id === itemId)?.value || "";
    // Create a new URL object based on the current window location
    const url = new URL(window.location.href);

    // If the selected value is already the current value, remove the query parameter
    if (selectedValue === value) {
      url.searchParams.delete(queryName);
      setValue("");
    } else {
      // Otherwise, set the new value and update the query parameter
      setValue(selectedValue);
      url.searchParams.set(queryName, itemId.toString());
    }

    // Push the updated URL to the router
    router.push(url.toString());
    // Close the popover
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[225px] justify-between"
        >
          {value
            ? filterItems.find((item) => item.value === value)?.label
            : `Select ${queryName}...`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[225px] p-0">
        <Command>
          <CommandInput placeholder={`Search ${queryName}...`} />
          <CommandList>
            <CommandEmpty>No {queryName} found.</CommandEmpty>
            <CommandGroup>
              {filterItems.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={() => {
                    handleFilterChange(item.id);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
