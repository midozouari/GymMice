import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import WorkoutTemplateCard from '@/components/WorkoutTemplateCard';
import type { TodaysWorkout } from '@/constants/workoutData';

const refresh = jest.fn(async () => {});
const workout: TodaysWorkout = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  slug: 'push-day',
  name: 'Push Day',
  durationMinutes: 55,
  exerciseCount: 2,
  exerciseIds: [
    '223e4567-e89b-42d3-a456-426614174000',
    '323e4567-e89b-42d3-a456-426614174000',
  ],
  muscles: ['Chest'],
  exercises: [{
    group: 'Chest',
    moves: [
      { id: '223e4567-e89b-42d3-a456-426614174000', name: 'Bench press' },
      { id: '323e4567-e89b-42d3-a456-426614174000', name: 'Cable fly' },
    ],
  }],
};

describe('WorkoutTemplateCard', () => {
  beforeEach(() => refresh.mockClear());

  it('renders the public Push Day API template, duration and schedule time', () => {
    render(
      <WorkoutTemplateCard
        workout={workout}
        status="ready"
        errorMessage={null}
        refresh={refresh}
        canRefresh
        scheduledStartTime="18:30"
      />,
    );
    expect(screen.getByText('Push Day')).toBeTruthy();
    expect(screen.getByText('Public template')).toBeTruthy();
    expect(screen.getByText('2 exercises')).toBeTruthy();
    expect(screen.getByText('~55 min')).toBeTruthy();
    expect(screen.getByText('18:30')).toBeTruthy();
  });

  it('expands grouped exercises and exposes accessible controls', () => {
    render(
      <WorkoutTemplateCard workout={workout} status="ready" errorMessage={null} refresh={refresh} canRefresh />,
    );
    fireEvent.press(screen.getByLabelText('Expand Push Day exercises'));
    expect(screen.getByText('Bench press')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Refresh workout template'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders loading, empty, and safe retry states', () => {
    const view = render(
      <WorkoutTemplateCard workout={null} status="loading" errorMessage={null} refresh={refresh} canRefresh={false} />,
    );
    expect(screen.getByLabelText('Loading workout template')).toBeTruthy();

    view.rerender(
      <WorkoutTemplateCard workout={null} status="empty" errorMessage={null} refresh={refresh} canRefresh />,
    );
    fireEvent.press(screen.getByLabelText('Refresh workout templates'));
    expect(refresh).toHaveBeenCalledTimes(1);

    view.rerender(
      <WorkoutTemplateCard workout={null} status="error" errorMessage="Workout templates are unavailable." refresh={refresh} canRefresh />,
    );
    expect(screen.getByText('Workout templates are unavailable.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Retry loading workout template'));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('disables refresh controls while refreshing', () => {
    render(
      <WorkoutTemplateCard workout={workout} status="refreshing" errorMessage={null} refresh={refresh} canRefresh={false} />,
    );
    fireEvent.press(screen.getByLabelText('Refresh workout template'));
    expect(refresh).not.toHaveBeenCalled();
  });
});