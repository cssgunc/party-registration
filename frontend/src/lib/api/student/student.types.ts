import {
  LocationDto,
  LocationDtoBackend,
  convertLocation,
} from "../location/location.types";

type ContactPreference = "call" | "text";

type StudentData = {
  contact_preference: ContactPreference;
  last_registered: Date | null;
  phone_number: string;
};

type StudentUpdateDto = StudentData & {
  first_name: string;
  last_name: string;
  residence_place_id?: string | null;
};

type StudentDto = {
  id: number;
  pid: string;
  email: string;
  first_name: string;
  last_name: string;
  onyen: string;
  phone_number: string;
  contact_preference: ContactPreference;
  last_registered: Date | null;
  residence: ResidenceDto | null;
};

type ResidenceDto = {
  location: LocationDto;
  residence_chosen_date: Date;
};

type ResidenceDtoBackend = {
  location: LocationDtoBackend;
  residence_chosen_date: string;
};

type StudentDtoBackend = Omit<StudentDto, "last_registered" | "residence"> & {
  last_registered: string | null;
  residence: ResidenceDtoBackend | null;
};

type ResidenceUpdateDto = {
  residence_place_id: string;
};

type ResidenceUpdateWithDisplayDto = ResidenceUpdateDto & {
  formatted_address: string;
};

function convertStudent(backend: StudentDtoBackend): StudentDto {
  return {
    ...backend,
    last_registered: backend.last_registered
      ? new Date(backend.last_registered)
      : null,
    residence: backend.residence
      ? {
          location: convertLocation(backend.residence.location),
          residence_chosen_date: new Date(
            backend.residence.residence_chosen_date
          ),
        }
      : null,
  };
}

type StudentCreateDto = {
  account_id: number;
  data: StudentUpdateDto;
};

type IsRegisteredUpdate = {
  is_registered: boolean;
};

export type {
  ContactPreference,
  IsRegisteredUpdate,
  ResidenceDto,
  ResidenceUpdateDto,
  ResidenceUpdateWithDisplayDto,
  StudentCreateDto,
  StudentData,
  StudentUpdateDto,
  StudentDto,
  StudentDtoBackend,
};

export { convertStudent };
