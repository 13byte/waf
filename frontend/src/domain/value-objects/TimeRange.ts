// Time range value object
export class TimeRange {
  constructor(
    public readonly startDate: Date,
    public readonly endDate: Date
  ) {
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }
  }

  getDuration(): number {
    return this.endDate.getTime() - this.startDate.getTime();
  }

  getDurationInHours(): number {
    return this.getDuration() / (1000 * 60 * 60);
  }

  getDurationInDays(): number {
    return this.getDuration() / (1000 * 60 * 60 * 24);
  }

  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  overlaps(other: TimeRange): boolean {
    return (
      this.startDate <= other.endDate &&
      this.endDate >= other.startDate
    );
  }

  equals(other: TimeRange): boolean {
    return (
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate.getTime() === other.endDate.getTime()
    );
  }

  toString(): string {
    return `${this.startDate.toISOString()} - ${this.endDate.toISOString()}`;
  }
}