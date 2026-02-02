"use client";
import React, { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { getClientCache, setClientCache } from "@/utils/clientCache";
import CalendarSkeleton from "@/components/calendar/CalendarSkeleton";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
  };
}

interface CalendarProps {
  canEdit?: boolean;
  initialEvents?: CalendarEvent[];
  academicYear?: string;
}

const Calendar: React.FC<CalendarProps> = ({
  canEdit = true,
  initialEvents,
  academicYear,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("Primary");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const calendarsEvents = {
    Danger: "danger",
    Success: "success",
    Primary: "primary",
    Warning: "warning",
  };

  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) {
      setEvents(initialEvents);
      return;
    }

    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const cacheKey = `calendar:${academicYear || "current"}`;
        const cached = getClientCache<CalendarEvent[]>(cacheKey);
        if (cached) {
          setEvents(cached);
          setIsLoadingEvents(false);
          return;
        }

        const yearParam = academicYear
          ? `?academicYear=${encodeURIComponent(academicYear)}`
          : "";
        const response = await fetch(`/api/calendar${yearParam}`);
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          setIsLoadingEvents(false);
          return;
        }
        const mapped = (payload.data || []).map((event: any) => ({
          id: event._id,
          title: event.title,
          start: event.startDate,
          end: event.endDate || event.startDate,
          allDay: true,
          extendedProps: {
            calendar: event.colorTag || "Primary",
          },
        }));
        setEvents(mapped);
        setClientCache(cacheKey, mapped);
      } catch (error) {
        console.error("Failed to load calendar events:", error);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [initialEvents, academicYear]);

  const handleAddOrUpdateEvent = async () => {
    setIsSavingEvent(true);
    try {
      if (selectedEvent) {
        const response = await fetch("/api/calendar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedEvent.id,
            title: eventTitle,
            startDate: eventStartDate,
            endDate: eventEndDate,
            colorTag: eventLevel,
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) return;
        const updated = payload.data;
        setEvents((prevEvents) => {
          const next = prevEvents.map((event) =>
            event.id === updated._id
              ? {
                  ...event,
                  title: updated.title,
                  start: updated.startDate,
                  end: updated.endDate || updated.startDate,
                  extendedProps: { calendar: updated.colorTag || "Primary" },
                }
              : event
          );
          setClientCache(`calendar:${academicYear || "current"}`, next);
          return next;
        });
      } else {
        const response = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: eventTitle,
            startDate: eventStartDate,
            endDate: eventEndDate,
            colorTag: eventLevel,
            academicYear,
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) return;
        const created = payload.data;
        const newEvent: CalendarEvent = {
          id: created._id,
          title: created.title,
          start: created.startDate,
          end: created.endDate || created.startDate,
          allDay: true,
          extendedProps: { calendar: created.colorTag || "Primary" },
        };
        setEvents((prevEvents) => {
          const next = [...prevEvents, newEvent];
          setClientCache(`calendar:${academicYear || "current"}`, next);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to save calendar event:", error);
    } finally {
      setIsSavingEvent(false);
      closeModal();
      resetModalFields();
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      const response = await fetch("/api/calendar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedEvent.id }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) return;
      setEvents((prevEvents) => {
        const next = prevEvents.filter(
          (event) => event.id !== selectedEvent.id
        );
        setClientCache(`calendar:${academicYear || "current"}`, next);
        return next;
      });
    } catch (error) {
      console.error("Failed to delete calendar event:", error);
    } finally {
      closeModal();
      resetModalFields();
    }
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("Primary");
    setSelectedEvent(null);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEvent(event as unknown as CalendarEvent);
    setEventTitle(event.title);
    setEventStartDate(event.start?.toISOString().split("T")[0] || "");
    setEventEndDate(event.end?.toISOString().split("T")[0] || "");
    setEventLevel(event.extendedProps.calendar);
    openModal();
  };

  if (isLoadingEvents) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="rounded-2xl border  border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="custom-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: canEdit ? "prev,next addEventButton" : "prev,next",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          selectable={canEdit}
          editable={canEdit}
          select={canEdit ? handleDateSelect : undefined}
          eventClick={canEdit ? handleEventClick : undefined}
          eventContent={renderEventContent}
          customButtons={
            canEdit
              ? {
                  addEventButton: {
                    text: "Add Event +",
                    click: openModal,
                  },
                }
              : {}
          }
        />
      </div>
      {canEdit ? (
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] p-6 lg:p-10"
        >
          <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
            <div>
              <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                {selectedEvent ? "Edit Event" : "Add Event"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Plan your next big moment: schedule or edit an event to stay on
                track
              </p>
            </div>
            <div className="mt-8">
              <div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Event Title
                  </label>
                  <input
                    id="event-title"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>
              <div className="mt-6">
                <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                  Event Color
                </label>
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  {Object.entries(calendarsEvents).map(([key, value]) => (
                    <div key={key} className="n-chk">
                      <div
                        className={`form-check form-check-${value} form-check-inline`}
                      >
                        <label
                          className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                          htmlFor={`modal${key}`}
                        >
                          <span className="relative">
                            <input
                              className="sr-only form-check-input"
                              type="radio"
                              name="event-level"
                              value={key}
                              id={`modal${key}`}
                              checked={eventLevel === key}
                              onChange={() => setEventLevel(key)}
                            />
                            <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                              <span
                                className={`h-2 w-2 rounded-full bg-white ${
                                  eventLevel === key ? "block" : "hidden"
                                }`}  
                              ></span>
                            </span>
                          </span>
                          {key}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Enter Start Date
                </label>
                <div className="relative">
                  <input
                    id="event-start-date"
                    type="date"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Enter End Date
                </label>
                <div className="relative">
                  <input
                    id="event-end-date"
                    type="date"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
              <button
                onClick={closeModal}
                type="button"
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
              >
                Close
              </button>
              {selectedEvent ? (
                <button
                  onClick={handleDeleteEvent}
                  type="button"
                  className="flex w-full justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 sm:w-auto"
                >
                  Delete
                </button>
              ) : null}
              <button
                onClick={handleAddOrUpdateEvent}
                type="button"
                disabled={isSavingEvent}
                className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isSavingEvent
                  ? "Saving..."
                  : selectedEvent
                  ? "Update Changes"
                  : "Add Event"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;
