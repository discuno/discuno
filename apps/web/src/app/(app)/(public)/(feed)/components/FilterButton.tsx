'use client'

import { Check, ChevronsUpDown, X, type LucideIcon } from 'lucide-react'
import { startTransition, useOptimistic, useState } from 'react'

import { useRouter } from 'next/navigation'
import { Button } from '~/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { cn, decodeUrlParam } from '~/lib/utils'

export interface FilterValue {
  value: string
  label: string
  id: number
}

interface FilterProps {
  filterItems: FilterValue[]
  queryName: string
  startValue: string
  label?: string
  className?: string
  icon?: LucideIcon
}

export const FilterButton = ({
  filterItems,
  queryName,
  startValue,
  label,
  className,
  icon: Icon,
}: FilterProps) => {
  const decodedStartValue = decodeUrlParam(startValue)
  const foundItem = filterItems.find(item => item.value === decodedStartValue)

  const [open, setOpen] = useState(false)
  const [value, setOptimisticValue] = useOptimistic(foundItem?.value ?? '')
  const router = useRouter()

  const handleFilterChange = (itemId: number) => {
    const selectedItem = filterItems.find(item => item.id === itemId)
    const selectedValue = selectedItem?.value ?? ''
    const url = new URL(window.location.href)

    const nextValue = selectedValue === value ? '' : selectedValue

    if (nextValue) {
      url.searchParams.set(queryName, nextValue)
    } else {
      url.searchParams.delete(queryName)
    }

    url.hash = 'mentors'
    startTransition(() => {
      setOptimisticValue(nextValue)
      router.push(url.pathname + url.search + url.hash)
    })
    setOpen(false)
  }

  const handleClearFilter = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = new URL(window.location.href)
    url.searchParams.delete(queryName)
    url.hash = 'mentors'
    startTransition(() => {
      setOptimisticValue('')
      router.push(url.pathname + url.search + url.hash)
    })
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label={label ?? `Select ${queryName}`}
              className={cn(
                'bg-card h-11 min-w-0 flex-1 justify-between px-3.5 font-medium',
                value && 'border-primary/30 text-foreground'
              )}
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            {Icon && <Icon className="text-primary size-4 shrink-0" aria-hidden="true" />}
            <span className={cn('truncate', !value && 'text-muted-foreground')}>
              {value
                ? filterItems.find(item => item.value === value)?.label
                : (label ?? `Select ${queryName}...`)}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent
          className="w-(--anchor-width) min-w-[260px] p-0"
          align="start"
          sideOffset={6}
        >
          <Command>
            <CommandInput placeholder={`Search ${label?.toLowerCase() ?? queryName}…`} />
            <CommandList>
              <CommandEmpty>No {queryName} found.</CommandEmpty>
              <CommandGroup>
                {filterItems.map(item => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    keywords={[item.label]}
                    onSelect={() => {
                      handleFilterChange(item.id)
                    }}
                    className="text-foreground"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === item.value ? 'opacity-100' : 'opacity-0'
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
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClearFilter}
          className="text-muted-foreground hover:text-foreground h-10 w-10 shrink-0"
          aria-label={`Clear ${queryName} filter`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
