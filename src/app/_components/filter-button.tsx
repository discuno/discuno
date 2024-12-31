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
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const router = useRouter();

  const handleFilterChange = (itemId: number) => {
    const selectedValue =
      filterItems.find((item) => item.id === itemId)?.value || "";
    const url = new URL(window.location.href);

    if (selectedValue === value) {
      url.searchParams.delete(queryName);
      setValue("");
    } else {
      setValue(selectedValue);
      url.searchParams.set(queryName, itemId.toString());
    }

    router.push(url.toString());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[225px] justify-between focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-gray-200"
        >
          {value
            ? filterItems.find((item) => item.value === value)?.label
            : `Select ${queryName}...`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[225px] bg-white p-0 dark:bg-gray-800">
        <Command>
          <CommandInput
            placeholder={`Search ${queryName}...`}
            className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          />
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
                  className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
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
