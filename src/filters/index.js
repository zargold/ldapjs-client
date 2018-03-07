const assert = require('assert-plus');
const { BerReader } = require('asn1');
const ldapFilter = require('ldap-filter');
const Protocol = require('../protocol');
const AndFilter = require('./and_filter');
const ApproximateFilter = require('./approx_filter');
const EqualityFilter = require('./equality_filter');
const ExtensibleFilter = require('./ext_filter');
const GreaterThanEqualsFilter = require('./ge_filter');
const LessThanEqualsFilter = require('./le_filter');
const NotFilter = require('./not_filter');
const OrFilter = require('./or_filter');
const PresenceFilter = require('./presence_filter');
const SubstringFilter = require('./substr_filter');

const parseSet = (f, ber) => {
  const end = ber.offset + ber.length;
  while (ber.offset < end) {
    f.addFilter(_parse(ber));
  }
};

const _parse = ber => {
  assert.ok(ber instanceof BerReader, 'ber (BerReader) required');

  let f;

  const type = ber.readSequence();
  switch (type) {
    case Protocol.FILTER_AND:
      f = new AndFilter();
      parseSet(f, ber);
      break;

    case Protocol.FILTER_APPROX:
      f = new ApproximateFilter();
      f.parse(ber);
      break;

    case Protocol.FILTER_EQUALITY:
      f = new EqualityFilter();
      f.parse(ber);
      return f;

    case Protocol.FILTER_EXT:
      f = new ExtensibleFilter();
      f.parse(ber);
      return f;

    case Protocol.FILTER_GE:
      f = new GreaterThanEqualsFilter();
      f.parse(ber);
      return f;

    case Protocol.FILTER_LE:
      f = new LessThanEqualsFilter();
      f.parse(ber);
      return f;

    case Protocol.FILTER_NOT:
      f = new NotFilter({
        filter: _parse(ber)
      });
      break;

    case Protocol.FILTER_OR:
      f = new OrFilter();
      parseSet(f, ber);
      break;

    case Protocol.FILTER_PRESENT:
      f = new PresenceFilter();
      f.parse(ber);
      break;

    case Protocol.FILTER_SUBSTRINGS:
      f = new SubstringFilter();
      f.parse(ber);
      break;

    default:
      throw new Error(`Invalid search filter type: 0x${type.toString(16)}`);
  }


  assert.ok(f);
  return f;
};

const cloneFilter = input => {
  switch (input.type) {
    case 'and':
      return new AndFilter({ filters: input.filters.map(cloneFilter) });
    case 'or':
      return new OrFilter({ filters: input.filters.map(cloneFilter) });
    case 'not':
      return new NotFilter({ filter: cloneFilter(input.filter) });
    case 'equal':
      return new EqualityFilter(input);
    case 'substring':
      return new SubstringFilter(input);
    case 'ge':
      return new GreaterThanEqualsFilter(input);
    case 'le':
      return new LessThanEqualsFilter(input);
    case 'present':
      return new PresenceFilter(input);
    case 'approx':
      return new ApproximateFilter(input);
    case 'ext':
      return new ExtensibleFilter(input);
    default:
      throw new Error(`invalid filter type: ${input.type}`);
  }
};

module.exports = {
  parse: ber => _parse(ber),
  parseString: str => cloneFilter(ldapFilter.parse(str)),
  PresenceFilter
};
