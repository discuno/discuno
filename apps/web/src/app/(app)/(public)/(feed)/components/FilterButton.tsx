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

export type DiscoveryFilterQueryName = 'school' | 'major' | 'gradYear'

const DISCOVERY_FILTER_QUERY_NAMES: DiscoveryFilterQueryName[] = ['school', 'major', 'gradYear']

export function createFindHref(
  currentSearch: string,
  queryName: DiscoveryFilterQueryName,
  nextValue: string
) {
  const currentParams = new URLSearchParams(currentSearch)
  const nextParams = new URLSearchParams()

  for (const allowedQueryName of DISCOVERY_FILTER_QUERY_NAMES) {
    const currentValue = currentParams.get(allowedQueryName)
    if (currentValue) nextParams.set(allowedQueryName, currentValue)
  }

  if (nextValue) {
    nextParams.set(queryName, nextValue)
  } else {
    nextParams.delete(queryName)
  }

  const query = nextParams.toString()
  return `/find${query ? `?${query}` : ''}#mentors`
}

interface FilterProps {
  filterItems: FilterValue[]
  queryName: DiscoveryFilterQueryName
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
  const selectedItem = filterItems.find(item => item.value === value)
  const controlLabel = label ?? `Select ${queryName}`

  const handleFilterChange = (itemId: number) => {
    const nextItem = filterItems.find(item => item.id === itemId)
    const selectedValue = nextItem?.value ?? ''
    const nextValue = selectedValue === value ? '' : selectedValue

    startTransition(() => {
      setOptimisticValue(nextValue)
      router.push(createFindHref(window.location.search, queryName, nextValue))
    })
    setOpen(false)
  }

  const handleClearFilter = (event: React.MouseEvent) => {
    event.stopPropagation()
    startTransition(() => {
      setOptimisticValue('')
      router.push(createFindHref(window.location.search, queryName, ''))
    })
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant={value ? 'secondary' : 'outline'}
              role="combobox"
              aria-expanded={open}
              aria-label={selectedItem ? `${controlLabel}: ${selectedItem.label}` : controlLabel}
              className="h-11 min-w-0 flex-1 justify-between"
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            {Icon && <Icon data-icon="inline-start" aria-hidden="true" />}
            <span className={cn('truncate', !value && 'text-muted-foreground')}>
              {selectedItem?.label ?? controlLabel}
            </span>
          </span>
          <ChevronsUpDown data-icon="inline-end" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          className="w-(--anchor-width) min-w-[260px] p-0"
          align="start"
          sideOffset={6}
        >
          <Command>
            <CommandInput placeholder={`Search ${controlLabel.toLowerCase()}`} />
            <CommandList>
              <CommandEmpty>No matching options.</CommandEmpty>
              <CommandGroup heading={controlLabel}>
                {filterItems.map(item => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    keywords={[item.label]}
                    onSelect={() => handleFilterChange(item.id)}
                  >
                    <Check
                      className={cn(value === item.value ? 'opacity-100' : 'opacity-0')}
                      aria-hidden="true"
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
          className="shrink-0"
          aria-label={`Clear ${controlLabel.toLowerCase()}`}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
