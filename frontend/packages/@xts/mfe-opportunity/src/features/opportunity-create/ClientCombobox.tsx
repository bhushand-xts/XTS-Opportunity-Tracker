import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  Input,
  Popover,
  PopoverAnchor,
  PopoverContent,
  type Customer,
} from "@xts/design-system";

// A standard "autocomplete" combobox: the visible field is the real, single
// <Input> (bound directly to the form value, same as any other text field —
// no second hidden search box), with a Popover anchored to it showing
// filtered existing clients plus a "Create new" fallback. Built entirely from
// Popover/Command primitives already in the design system.
export function ClientCombobox({
  value,
  onChange,
  customers,
  onSelectCustomer,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  customers: Customer[];
  onSelectCustomer: (customer: Customer | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const text = value.trim().toLowerCase();
    if (!text) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(text));
  }, [customers, value]);

  const exactMatch = matches.some((c) => c.name.toLowerCase() === value.trim().toLowerCase());

  function selectExisting(customer: Customer) {
    onChange(customer.name);
    onSelectCustomer(customer);
    setOpen(false);
  }

  function selectCreateNew() {
    onSelectCustomer(null);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onSelectCustomer(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (e.target instanceof HTMLElement && e.target.closest("input")) e.preventDefault();
        }}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {matches.length === 0 && <CommandEmpty>No matching clients.</CommandEmpty>}
            {matches.length > 0 && (
              <CommandGroup heading="Existing clients">
                {matches.map((c) => (
                  <CommandItem key={c.id} value={c.id} onSelect={() => selectExisting(c)}>
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {value.trim() && !exactMatch && (
              <CommandGroup>
                <CommandItem value={`__create__${value}`} onSelect={selectCreateNew}>
                  <Plus className="mr-2 size-4" />
                  Create &quot;{value.trim()}&quot;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
