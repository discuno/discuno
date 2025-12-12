import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '~/lib/utils'

function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          'border-input bg-background ring-ring text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/50 peer has-[option[disabled]:checked]:text-muted-foreground inline-flex h-9 w-full appearance-none rounded-md border text-sm shadow-xs transition-[border-color,box-shadow] outline-none focus:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          'py-1 pr-8 pl-3', // Added specific padding for alignment
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        data-slot="native-select-indicator"
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 peer-disabled:opacity-50"
      />
    </div>
  )
}

function NativeSelectOption({ className, children, ...props }: React.ComponentProps<'option'>) {
  return (
    <option data-slot="native-select-option" className={cn(className)} {...props}>
      {children}
    </option>
  )
}

function NativeSelectOptGroup({ className, children, ...props }: React.ComponentProps<'optgroup'>) {
  return (
    <optgroup data-slot="native-select-optgroup" className={cn(className)} {...props}>
      {children}
    </optgroup>
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
