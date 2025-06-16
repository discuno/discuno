'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { useCalApi } from '../provider/cal-provider'
import type { BookingField, EventType, Location } from '../types'

interface EventTypeSettingsProps {
  eventTypeId?: number
  onSave?: (eventType: EventType) => void
  onError?: (error: Error) => void
  className?: string
}

export function EventTypeSettings({
  eventTypeId,
  onSave,
  onError,
  className,
}: EventTypeSettingsProps) {
  const { apiClient } = useCalApi()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<Partial<EventType>>({
    title: '',
    description: '',
    length: 30,
    slug: '',
    locations: [],
    bookingFields: [],
    requiresConfirmation: false,
    disableGuests: false,
    minimumBookingNotice: 0,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
  })

  // Fetch existing event type
  const { data: eventType, isLoading } = useQuery({
    queryKey: ['eventType', eventTypeId],
    queryFn: () => {
      if (!apiClient || !eventTypeId) throw new Error('API client or event type ID not available')
      return apiClient.getEventType(eventTypeId)
    },
    enabled: !!(apiClient && eventTypeId),
  })

  // Load event type data into form
  useEffect(() => {
    if (eventType) {
      setFormData({
        title: eventType.title,
        description: eventType.description,
        length: eventType.length,
        slug: eventType.slug,
        locations: eventType.locations ?? [],
        bookingFields: eventType.bookingFields ?? [],
        requiresConfirmation: eventType.requiresConfirmation,
        disableGuests: eventType.disableGuests,
        minimumBookingNotice: eventType.minimumBookingNotice,
        beforeEventBuffer: eventType.beforeEventBuffer,
        afterEventBuffer: eventType.afterEventBuffer,
      })
    }
  }, [eventType])

  // Save event type mutation
  const saveEventTypeMutation = useMutation({
    mutationFn: async (data: Partial<EventType>) => {
      if (!apiClient) throw new Error('API client not available')
      if (eventTypeId) {
        return await apiClient.updateEventType(eventTypeId, data)
      } else {
        return await apiClient.createEventType(data)
      }
    },
    onSuccess: savedEventType => {
      onSave?.(savedEventType)
      void queryClient.invalidateQueries({ queryKey: ['eventTypes'] })
      void queryClient.invalidateQueries({ queryKey: ['eventType', eventTypeId] })
    },
    onError: error => {
      onError?.(error instanceof Error ? error : new Error('Failed to save event type'))
    },
  })

  const handleSave = () => {
    saveEventTypeMutation.mutate(formData)
  }

  const updateFormData = (field: keyof EventType, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addLocation = () => {
    const newLocation: Location = {
      type: 'integrations:zoom',
      displayLocationPublicly: true,
    }
    updateFormData('locations', [...(formData.locations ?? []), newLocation])
  }

  const removeLocation = (index: number) => {
    const locations = formData.locations ?? []
    updateFormData(
      'locations',
      locations.filter((_, i) => i !== index)
    )
  }

  const updateLocation = (
    index: number,
    field: keyof Location,
    value: string | number | boolean
  ) => {
    const locations = [...(formData.locations ?? [])]
    if (locations[index]) {
      locations[index] = { ...locations[index], [field]: value }
      updateFormData('locations', locations)
    }
  }

  const addBookingField = () => {
    const newField: BookingField = {
      name: `custom_field_${Date.now()}`,
      type: 'text',
      label: 'Custom Field',
      required: false,
    }
    updateFormData('bookingFields', [...(formData.bookingFields ?? []), newField])
  }

  const removeBookingField = (index: number) => {
    const fields = formData.bookingFields ?? []
    updateFormData(
      'bookingFields',
      fields.filter((_, i) => i !== index)
    )
  }

  const updateBookingField = (
    index: number,
    field: keyof BookingField,
    value: string | boolean | string[]
  ) => {
    const fields = [...(formData.bookingFields ?? [])]
    if (fields[index]) {
      fields[index] = { ...fields[index], [field]: value }
      updateFormData('bookingFields', fields)
    }
  }

  if (!apiClient) {
    return <div>Initializing API client...</div>
  }

  if (isLoading) {
    return <div>Loading event type...</div>
  }

  return (
    <div className={`event-type-settings ${className ?? ''}`}>
      <div className="settings-header">
        <h2>{eventTypeId ? 'Edit Event Type' : 'Create Event Type'}</h2>
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          handleSave()
        }}
      >
        {/* Basic Information */}
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <label htmlFor="title">Event Title *</label>
            <input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={e => {
                updateFormData('title', e.target.value)
              }}
              placeholder="30 Minute Meeting"
            />
          </div>

          <div className="form-group">
            <label htmlFor="slug">URL Slug *</label>
            <input
              id="slug"
              type="text"
              required
              value={formData.slug}
              onChange={e => {
                updateFormData('slug', e.target.value)
              }}
              placeholder="30min"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description ?? ''}
              onChange={e => {
                updateFormData('description', e.target.value)
              }}
              placeholder="A brief description of this meeting"
            />
          </div>

          <div className="form-group">
            <label htmlFor="length">Duration (minutes) *</label>
            <input
              id="length"
              type="number"
              required
              min="1"
              max="1440"
              value={formData.length}
              onChange={e => {
                updateFormData('length', parseInt(e.target.value))
              }}
            />
          </div>
        </div>

        {/* Locations */}
        <div className="form-section">
          <h3>Locations</h3>
          {formData.locations?.map((location, index) => (
            <div key={index} className="location-item">
              <div className="form-group">
                <label>Location Type</label>
                <select
                  value={location.type}
                  onChange={e => {
                    updateLocation(index, 'type', e.target.value)
                  }}
                >
                  <option value="integrations:zoom">Zoom</option>
                  <option value="integrations:googlemeet">Google Meet</option>
                  <option value="integrations:daily">Daily.co</option>
                  <option value="inPerson">In Person</option>
                  <option value="link">Custom Link</option>
                  <option value="phone">Phone</option>
                </select>
              </div>

              {location.type === 'inPerson' && (
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={location.address ?? ''}
                    onChange={e => {
                      updateLocation(index, 'address', e.target.value)
                    }}
                    placeholder="123 Main St, City, State"
                  />
                </div>
              )}

              {location.type === 'link' && (
                <div className="form-group">
                  <label>Meeting Link</label>
                  <input
                    type="url"
                    value={location.link ?? ''}
                    onChange={e => {
                      updateLocation(index, 'link', e.target.value)
                    }}
                    placeholder="https://example.com/meeting"
                  />
                </div>
              )}

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={location.displayLocationPublicly}
                    onChange={e => {
                      updateLocation(index, 'displayLocationPublicly', e.target.checked)
                    }}
                  />
                  Display location publicly
                </label>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  removeLocation(index)
                }}
              >
                Remove Location
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addLocation}>
            Add Location
          </Button>
        </div>

        {/* Booking Settings */}
        <div className="form-section">
          <h3>Booking Settings</h3>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.requiresConfirmation}
                onChange={e => {
                  updateFormData('requiresConfirmation', e.target.checked)
                }}
              />
              Require confirmation before booking
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.disableGuests}
                onChange={e => {
                  updateFormData('disableGuests', e.target.checked)
                }}
              />
              Disable additional guests
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="minimumBookingNotice">Minimum booking notice (minutes)</label>
            <input
              id="minimumBookingNotice"
              type="number"
              min="0"
              value={formData.minimumBookingNotice}
              onChange={e => {
                updateFormData('minimumBookingNotice', parseInt(e.target.value))
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="beforeEventBuffer">Buffer before event (minutes)</label>
            <input
              id="beforeEventBuffer"
              type="number"
              min="0"
              value={formData.beforeEventBuffer}
              onChange={e => {
                updateFormData('beforeEventBuffer', parseInt(e.target.value))
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="afterEventBuffer">Buffer after event (minutes)</label>
            <input
              id="afterEventBuffer"
              type="number"
              min="0"
              value={formData.afterEventBuffer}
              onChange={e => {
                updateFormData('afterEventBuffer', parseInt(e.target.value))
              }}
            />
          </div>
        </div>

        {/* Custom Booking Fields */}
        <div className="form-section">
          <h3>Custom Booking Fields</h3>
          {formData.bookingFields?.map((field, index) => (
            <div key={index} className="booking-field-item">
              <div className="form-group">
                <label>Field Label</label>
                <input
                  type="text"
                  value={field.label ?? ''}
                  onChange={e => {
                    updateBookingField(index, 'label', e.target.value)
                  }}
                  placeholder="Field Label"
                />
              </div>

              <div className="form-group">
                <label>Field Type</label>
                <select
                  value={field.type}
                  onChange={e => {
                    updateBookingField(index, 'type', e.target.value)
                  }}
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="select">Select</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="radio">Radio</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={e => {
                      updateBookingField(index, 'required', e.target.checked)
                    }}
                  />
                  Required field
                </label>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  removeBookingField(index)
                }}
              >
                Remove Field
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addBookingField}>
            Add Custom Field
          </Button>
        </div>

        <div className="form-actions">
          <Button type="submit" disabled={saveEventTypeMutation.isPending}>
            {saveEventTypeMutation.isPending ? 'Saving...' : 'Save Event Type'}
          </Button>
        </div>
      </form>
    </div>
  )
}
